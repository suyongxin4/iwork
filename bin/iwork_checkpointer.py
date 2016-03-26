from datetime import datetime
from datetime import timedelta
import threading
import copy
import time

import iwork_consts as c
from splunktalib.common import log

# logger should be init at the very begging of everything
logger = log.Logs(c.iwork_log_ns).get_logger(c.iwork_log)


import splunktalib.state_store as ss
import iwork_consts as c


class WorkCheckpointer(object):
    _time_fmt = "%Y-%m-%d"

    def __init__(self, config):
        self._config = config
        self._ckpt = ss.get_state_store(config, c.splunk_app_iwork)

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
        self._ckpt = ss.get_state_store(
            config, c.splunk_app_iwork,
            collection_name="iwork", use_kv_store=True)
        self._lock = threading.Lock()
        self._cached = self._ckpt.get_all_states()
        if self._cached is None:
            self._cached = {}

    def update(self, name, email):
        if name and "@" in name and name.endswith("splunk.com"):
            return

        with self._lock:
            if name not in self._cached:
                state = {
                    "name": name.encode("ascii", "ignore"),
                    "email": email,
                    "department": "Unknown",
                    "location": "Unknown",
                    "manager": "Unknown"
                }
                self._ckpt.update_state(name, state)
                self._cached[name] = state
            elif not self._cached[name].get("email"):
                self._cached[name]["email"] = email
                self._ckpt.update_state(name, self._cached[name])

    def all(self):
        with self._lock:
            return copy.copy(self._cached)

    def delete_all(self):
        self._ckpt._kv_client.delete_collection("iwork", c.splunk_app_iwork)

    def update_in_batch(self, emps):
        with self._lock:
            self._ckpt.update_state_in_batch(emps)


def insert_all_emps(config, charts):
    store = ss.get_state_store(config, c.splunk_app_iwork)
    state = store.get_state("batch_insert_done")
    if state:
        logger.info("batch insert already done")
        return

    ckpt = EmployeeDetailLookup(config)
    charts = [{"_key": chart["name"], "value": chart} for chart in charts]
    start, end, n = 0, 1000, len(charts)
    while 1:
        if end > n:
            end = n

        ckpt.update_in_batch(charts[start:end])
        if end == n:
            break

        start = end
        end += 1000

    store.update_state(
        "batch_insert_done", {"done": True, "timestamp": time.time()})
    logger.info("batch insert done")


if __name__ == "__main__":
    import json
    import os

    config = {
        "server_uri": "https://localhost:8089",
        "session_key": os.environ["session_key"],
        "checkpoint_dir": "."
    }

    ckpt = EmployeeDetailLookup(config)
    print ckpt.all()
    # ckpt.delete_all()

    # with open("report.json") as f:
    #    charts = json.load(f)

    #insert_all_emps(config, charts)
    # ckpt = EmployeeDetailLookup(config)
    # print ckpt.all()

    # for chart in charts:
    #    ckpt.update(chart["name"], chart["email"])
    # ckpt.delete_all()
