from datetime import datetime
from datetime import timedelta
import time
import traceback
import base64
import re
import imaplib
from email.parser import Parser
import json


import iwork_consts as c
from splunktalib.common import log

# logger should be init at the very begging of everything
logger = log.Logs(c.iwork_log_ns).get_logger(c.iwork_log)


import iwork_checkpointer as ickpt
import splunktalib.common.pattern as scp


def _get_key(folder):
    return "iemail_{folder}".format(folder=base64.b64encode(folder))


def search(connection, folder, filters):
    for i in xrange(10):
        try:
            res, data = connection.search(None, filters)
            if res == "OK":
                return data
            else:
                msg = ("Failed to search email for folder={} with filters={}, "
                       "error={}").format(folder, filters, res)
                logger.error(msg)
                raise Exception(msg)
        except Exception:
            logger.error(
                "Failed to search email for folder=%s with filters=%s, "
                "error=%s", folder, filters, traceback.format_exc())
            time.sleep(2)
            continue
    return None


def fetch(connection, msg_id):
    for i in xrange(3):
        try:
            res, data = connection.fetch(msg_id, "(RFC822)")
            if res == "OK":
                return data
            else:
                msg = "Failed to get email for email_id={}, error={}".format(
                    msg_id, res)
                logger.error(msg)
                raise Exception(msg)
        except Exception:
            logger.error("Failed to get email for email_id=%s, error=%s",
                         msg_id, traceback.format_exc())
            time.sleep(2)
            continue
    return None


def message_to_json(message, ckpt, raw=False):
    if not message[0]:
        logger.warn("Got invalid message=%s", message)
        return None

    p = Parser()
    msg = p.parsestr(message[0][1])
    pat = re.compile(r"\"?([a-zA-Z0-9\s\.@]*)\"?\s*<([^>]+\.com)>")
    sender = msg.get("From")
    name = sender
    if sender and not raw:
        res = pat.search(sender)
        if res:
            name, sender = res.group(1).strip(), res.group(2).strip().lower()
            if name:
                ckpt.update(name, sender)
            else:
                logger.warn("Unmatched from=%s", msg.get("From"))

    receivers = msg.get("To")
    if receivers and not raw:
        receivers = pat.findall(receivers)
        if receivers:
            res = []
            for name, email in receivers:
                name, email = name.strip(), email.lower().strip()
                res.append(email)
                if name:
                    ckpt.update(name.strip(), email.strip())
                else:
                    logger.warn("Unmatched to=%s", email)
            receivers = res
        else:
            receivers = msg.get("To").split(",")

    json_event = {
        "from": sender,
        "to": receivers,
        "subject": msg.get("Subject"),
        "date": msg.get("Date"),
        "thread-topic": msg.get("Thread-Topic"),
    }
    return json_event


def _get_folders(connection, ignores=()):
    res, data = connection.list()
    if res != "OK":
        logger.error("Failed to list email folders, reason=%s", res)
        return []

    folders = []
    for folder in data:
        if '"/"' not in folder:
            logger.warn("Ignore invalid email folder=%s", folder)
            continue

        folder = folder.split('"/"')[1].strip()
        if folder.lower() in ignores:
            continue

        folders.append(folder)
    logger.info("Scanning email folders=%s", folders)
    return folders


def create_connection(config):
    connection = imaplib.IMAP4_SSL(config[c.host], 993)
    connection.login(config[c.username], config[c.password])
    return connection


def get_folders(config):
    connection = create_connection(config)
    return _get_folders(connection, OutlookEmailDataLoader.ignores)


class OutlookEmailDataLoader(object):

    _email_time_fmt = "%d-%b-%Y"
    _event_fmt = ("""<stream><event><source>{source}</source>"""
                  """<host>{host}</host><index>{index}</index>"""
                  """<sourcetype>iwork:email</sourcetype>"""
                  """<data><![CDATA[{data}]]></data>"""
                  """</event></stream>""")
    ignores = ["drafts", '"deleted items"', '"junk e-mail"', "contacts",
               "calendar", "journal"]

    def __init__(self, config):
        """
        :config: dict which contains
        {
        "host": exchange_host,
        "username": username,
        "password": your_password,
        "start_date": datatime string in "%Y-%m-%d" in UTC,
        "folders": ["INBOX", "INBOX/AddOn"],
        }
        """

        self._config = config
        self._ckpt = ickpt.WorkCheckpointer(config)

    def __call__(self):
        self.collect_data()

    @scp.catch_all(logger)
    def collect_data(self):
        logger.info("Start collecting email data")
        connection = create_connection(self._config)
        folders = self._config.get(c.folders)
        if not folders:
            folders = _get_folders(connection, self.ignores)

        for folder in folders:
            self._collect_and_index(connection, folder)

        logger.info("End of collecting email data")

    def _collect_and_index(self, connection, folder):
        start_date = self._ckpt.end_date(_get_key(folder))
        end_date = datetime.utcnow()

        def do_collect(sdate, edate):
            sdate_str = datetime.strftime(sdate, self._email_time_fmt)
            edate_str = datetime.strftime(edate, self._email_time_fmt)
            filters = '(SINCE "{start}" BEFORE "{end}")'.format(
                start=sdate_str, end=edate_str)

            emails = self._collect_data_for_folder(connection, folder, filters)
            self._write_events(folder, emails)
            self._ckpt.set_end_date(_get_key(folder), edate)

        while 1:
            edate = start_date + timedelta(days=1)
            if edate >= end_date:
                break

            do_collect(start_date, edate)
            start_date = edate
        do_collect(start_date, end_date)

    def _collect_data_for_folder(self, connection, folder, filters):
        logger.info("Start collecting email data for folder=%s, filters=%s",
                    folder, filters)
        connection.select(folder)
        data = search(connection, folder, filters)
        if data is None:
            return

        emails = []
        msg_ids = data[0].split()
        for msg_id in msg_ids:
            data = fetch(connection, msg_id)
            if data is None:
                continue

            msg = message_to_json(data, self._config["ckpt"])
            if msg is not None:
                emails.append(msg)
        logger.info("End of collecting email data for folder=%s, filters=%s",
                    folder, filters)
        return emails

    def _write_events(self, folder, emails):
        if not emails:
            return

        index = self._config.get(c.index, "main")
        host = self._config[c.host]

        events = []
        for e in emails:
            event = self._event_fmt.format(
                source=folder, host=host, index=index, data=json.dumps(e))
            events.append(event)
        self._config[c.event_writer].write_events("".join(events))

    def get_props(self):
        return self._config

    def get_interval(self):
        return self._config.get(c.polling_interval, 86400)

    def stop(self):
        pass


if __name__ == "__main__":
    import sys

    class O(object):
        def write_events(self, events):
            sys.stdout.write(events)

    config = {
        c.host: "west.mail.splunk.com",
        c.username: "kchen@splunk.com",
        c.password: "***",
        c.start_date: "2015-01-01",
        c.folders: ["Sent Items"],
        c.event_writer: O(),
        c.checkpoint_dir: ".",
    }
    loader = OutlookEmailDataLoader(config)
    loader.collect_data()
