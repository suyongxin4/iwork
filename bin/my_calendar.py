from datetime import datetime
from datetime import timedelta
import time
import sys

from pyexchange import Exchange2010Service, ExchangeNTLMAuthConnection


import my_calendar_consts as c


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
            "email": attendee.email,
            "required": attendee.required,
        })
    json_event["attendees"] = attendees
    return json_event


class OutlookCalendarDataLoader(object):

    _time_fmt = "%Y-%m-%dT%H:%M:%S"

    def __init__(self, config):
        """
        :config: dict which contains
        {
        "url": exchange_url,
        "username": domain\\username,
        "password": your_password,
        "start_date": datatime string in "%Y-%m-%dT%H:%M:%S" in UTC,
        "end_date": datatime string in "%Y-%m-%dT%H:%M:%S" in UTC,
        }
        """

        self._config = config

    def collect_data(self):
        connection = ExchangeNTLMAuthConnection(
            url=self._config[c.url], username=self._config[c.username],
            password=self._config[c.password])
        service = Exchange2010Service(connection)
        calendar = service.calendar()
        start_date = datetime.strptime(
            self._config[c.start_date], self._time_fmt)
        end_date = datetime.strptime(
            self._config[c.end_date], self._time_fmt)

        all_events = []
        while 1:
            edate = start_date + timedelta(days=1)
            if edate >= end_date:
                break

            sys.stderr.write("%s %s\n" % (start_date, edate))
            events = self._get_json_events(calendar, start_date, edate)
            all_events.extend(events)
            start_date = edate

        events = self._get_json_events(calendar, start_date, end_date)
        all_events.extend(events)

        return all_events

    def _get_json_events(self, calendar, start_date, end_date):
        events = self._list_events(calendar, start_date, end_date)
        if events is None:
            return []

        return [event_to_json(event) for event in events.events]

    def _list_events(self, calendar, start_date, end_date):
        for i in range(3):
            try:
                return calendar.list_events(
                    start=start_date, end=end_date, details=True)
            except Exception:
                time.sleep((i + 1)**2)
        return None


if __name__ == "__main__":
    import json

    config = {
        c.url: "https://west.mail.splunk.com/EWS/Exchange.asmx",
        c.username: "\\kchen@splunk.com",
        c.password: "******",
        c.start_date: "2015-01-01T00:00:00",
        c.end_date: "2015-12-31T23:59:59",
    }
    loader = OutlookCalendarDataLoader(config)
    results = loader.collect_data()
    for result in results:
        print json.dumps(result)
