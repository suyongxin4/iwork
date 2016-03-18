from datetime import datetime
from datetime import timedelta

import splunktalib.state_store as ss
import iwork_consts as c


class WorkCheckpointer(object):
    _time_fmt = "%Y-%m-%d"

    def __init__(self, config):
        self._config = config
        self._ckpt = ss.get_state_store(config, c.splunk_ta_iwork)

    def end_date(self, key):
        state = self._ckpt.get_state(key)
        if state:
            edate = state["end_date"]
        else:
            edate = self._config[c.start_date]
            if not edate:
                edate = datetime.strftime(
                    datetime.utcnow() - timedelta(months=12), self._time_fmt)

        return datetime.strptime(edate, self._time_fmt)

    def set_end_date(self, key, edate):
        edate = datetime.strftime(edate, self._time_fmt)
        self._ckpt.update_state(key, {"end_date": edate})


class EmployeeDetailLookup(object):

    def __init__(self, config):
        self._config = config
        pass
