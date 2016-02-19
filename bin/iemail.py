from datetime import datetime
from datetime import timedelta
import imaplib
from email.parser import Parser
import json


import iwork_consts as c
from splunktalib.common import log

# logger should be init at the very begging of everything
logger = log.Logs(c.iwork_log_ns).get_logger(c.iwork_log)


import splunktalib.common.pattern as scp


def message_to_json(message):
    if not message[0]:
        logger.warn("Got invalid message=%s", message)
        return None

    p = Parser()
    msg = p.parsestr(message[0][1])
    json_event = {
        "from": msg.get("From"),
        "to": msg.get("To"),
        "subject": msg.get("Subject"),
        "date": msg.get("Date"),
        "thread-topic": msg.get("Thread-Topic"),
    }
    return json_event


def get_folders(connection):
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
        folders.append(folder)
    return folders


class OutlookEmailDataLoader(object):

    _time_fmt = "%Y-%m-%d"
    _email_time_fmt = "%d-%b-%Y"
    _event_fmt = ("""<stream><event><source>{source}</source>"""
                  """<host>{host}</host><index>{index}</index>"""
                  """<sourcetype>iwork:email</sourcetype>"""
                  """<data><![CDATA[{data}]]></data>"""
                  """</event></stream>""")

    def __init__(self, config):
        """
        :config: dict which contains
        {
        "host": exchange_host,
        "username": username,
        "password": your_password,
        "start_date": datatime string in "%Y-%m-%d" in UTC,
        "end_date": datatime string in "%Y-%m-%d" in UTC,
        "folders": ["INBOX", "INBOX/AddOn"],
        }
        """

        self._config = config
        self._get_start_end_dates()

    def __call__(self):
        self.collect_data()

    @scp.catch_all(logger)
    def collect_data(self):
        logger.info("Start collecting email data")
        connection = imaplib.IMAP4_SSL(self._config[c.host], 993)
        connection.login(self._config[c.username], self._config[c.password])
        folders = self._config.get(c.folders)
        if not folders:
            folders = get_folders(connection)

        start_date = self._config[c.start_date]
        end_date = self._config[c.end_date]
        while 1:
            edate = start_date + timedelta(days=1)
            if edate >= end_date:
                break

            self._collect_and_index(connection, folders, start_date, edate)
            start_date = edate

        self._collect_and_index(connection, folders, start_date, end_date)
        logger.info("End of collecting email data")

    def _collect_and_index(self, connection, folders, start_date, edate):
        sdate_str = datetime.strftime(start_date, self._email_time_fmt)
        edate_str = datetime.strftime(edate, self._email_time_fmt)

        filters = '(SINCE "{start}" BEFORE "{end}")'.format(
            start=sdate_str, end=edate_str)

        for folder in folders:
            emails = self._collect_data_for_folder(
                connection, folder, filters)
            self._write_events(folder, emails)

    def _collect_data_for_folder(self, connection, folder, filters):
        logger.debug("Start collecting email data for folder=%s, filters=%s",
                     folder, filters)
        connection.select(folder)
        res, data = connection.search(None, filters)
        if res != "OK":
            logger.error("Failed to search email for folder=%s with "
                         "filters=%s, error=%s", folder, filters, res)
            return

        # FIXME checkpoint
        emails = []
        msg_ids = data[0].split()
        for msg_id in msg_ids:
            res, data = connection.fetch(msg_id, "(RFC822)")
            if res != "OK":
                logger.error("Failed to get email for email_id=%s, error=%s",
                             msg_id, res)
                continue

            msg = message_to_json(data)
            if msg is not None:
                emails.append(msg)
        logger.debug("End of collecting email data for folder=%s, filters=%s",
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

    def _get_start_end_dates(self):
        if self._config.get(c.start_date):
            start_date = datetime.strptime(
                self._config[c.start_date], self._time_fmt)
        else:
            start_date = datetime.utcnow() - timedelta(months=12)
        self._config[c.start_date] = start_date

        if self._config.get(c.end_date):
            end_date = datetime.strptime(
                self._config[c.end_date], self._time_fmt)
        else:
            end_date = datetime.utcnow()
        self._config[c.end_date] = end_date

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
        c.end_date: "2016-02-16",
        c.folders: ["Sent Items"],
        c.event_writer: O(),
    }
    loader = OutlookEmailDataLoader(config)
    loader.collect_data()
