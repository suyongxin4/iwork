from datetime import datetime
from datetime import timedelta
import json
import time
import traceback

from pyexchange import Exchange2010Service, ExchangeNTLMAuthConnection


import iwork_consts as c
from splunktalib.common import log

# logger should be init at the very begging of everything
logger = log.Logs(c.iwork_log_ns).get_logger(c.iwork_log)


import iwork_checkpointer as ickpt
import splunktalib.common.pattern as scp


def event_to_json(event):
    json_event = {
        "start": datetime.strftime(event.start, "%Y-%m-%dT%H:%M:%S"),
        "stop": datetime.strftime(event.end, "%Y-%m-%dT%H:%M:%S"),
        "subject": event.subject,
        "attendees": None,
    }

    attendees = []
    for attendee in event.attendees:
        attendees.append({
            "name": attendee.name,
            "email": attendee.email.lower(),
            "required": attendee.required,
        })
    json_event["attendees"] = attendees
    return json_event


class OutlookCalendarDataLoader(object):

    _event_fmt = ("""<stream><event>"""
                  """<host>{host}</host><index>{index}</index>"""
                  """<sourcetype>iwork:calendar</sourcetype>"""
                  """<data><![CDATA[{data}]]></data>"""
                  """</event></stream>""")

    def __init__(self, config):
        """
        :config: dict which contains
        {
        "host": exchange_host,
        "username": domain\\username,
        "password": your_password,
        "start_date": datatime string in "%Y-%m-%d" in UTC,
        }
        """

        if not config[c.username].startswith("\\"):
            config[c.username] = "\\{username}".format(
                username=config[c.username])

        self._config = config
        self._ckpt = ickpt.WorkCheckpointer(config)
        self._key = "icalendar"

    def __call__(self):
        self.collect_data()

    @scp.catch_all(logger)
    def collect_data(self):
        logger.info("Start collecting calendar data")
        url = "https://{host}/EWS/Exchange.asmx".format(
            host=self._config[c.host])
        connection = ExchangeNTLMAuthConnection(
            url=url, username=self._config[c.username],
            password=self._config[c.password])
        service = Exchange2010Service(connection)
        calendar = service.calendar()
        start_date = self._ckpt.end_date(self._key)
        end_date = datetime.utcnow()

        while 1:
            edate = start_date + timedelta(days=1)
            if edate >= end_date:
                break

            self._collect_and_index(calendar, start_date, edate)
            self._ckpt.set_end_date(self._key, edate)
            start_date = edate

        logger.info("End of collecting calendar data")

    def _collect_and_index(self, calendar, start_date, end_date):
        logger.info("Start collecting calendar data from=%s, to=%s",
                    start_date, end_date)
        all_events = self._list_events(calendar, start_date, end_date)
        if all_events is None:
            return

        index = self._config.get(c.index, "main")
        host = self._config[c.host]

        events = []
        for e in all_events.events:
            event = self._event_fmt.format(
                host=host, index=index, data=json.dumps(event_to_json(e)))
            events.append(event)
        self._config[c.event_writer].write_events("".join(events))
        logger.info("End of collecting calendar data from=%s, to=%s",
                    start_date, end_date)

    @staticmethod
    def _list_events(calendar, start_date, end_date):
        for i in range(3):
            try:
                return calendar.list_events(
                    start=start_date, end=end_date, details=True)
            except Exception:
                logger.error("Failed to list events, error=%s",
                             traceback.format_exc())
                time.sleep((i + 1)**2)
        return None

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
        c.username: "\\kchen@splunk.com",
        c.password: "***",
        c.start_date: "2015-01-01",
        c.checkpoint_dir: ".",
        c.event_writer: O(),
    }

    loader = OutlookCalendarDataLoader(config)
    loader.collect_data()
