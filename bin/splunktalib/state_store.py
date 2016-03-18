import os.path as op
import os
import json

import splunktalib.kv_client as kvc
from splunktalib.common import util


def get_state_store(meta_configs, appname, collection_name="talib_states",
                    use_kv_store=False):
    if util.is_true(use_kv_store):
        return StateStore(meta_configs, appname, collection_name)
    else:
        return FileStateStore(meta_configs, appname)


class BaseStateStore(object):
    def __init__(self, meta_configs, appname):
        self._meta_configs = meta_configs
        self._appname = appname

    def update_state(self, key, state):
        pass

    def update_state_in_batch(self, states):
        """
        :param states: a list of dict which contains
        {
        "_key": xxx,
        "value": json_states,
        }
        """
        pass

    def get_state(self, key):
        pass

    def delete_state(self, key):
        pass


class StateStore(BaseStateStore):

    def __init__(self, meta_configs, appname, collection_name="talib_states"):
        """
        :meta_configs: dict like and contains checkpoint_dir, session_key,
         server_uri etc
        :app_name: the name of the app
        :collection_name: the collection name to be used.
        Don"t use other method to visit the collection if you are using
         StateStore to visit it.
        """
        super(StateStore, self).__init__(meta_configs, appname)

        self._kv_client = None
        self._collection = collection_name
        self._kv_client = kvc.KVClient(meta_configs["server_uri"],
                                       meta_configs["session_key"])
        kvc.create_collection(self._kv_client, self._collection, self._appname)

    def update_state(self, key, state):
        """
        :state: Any JSON serializable
        :return: None if successful, otherwise throws exception
        """

        val = self.get_state(key)
        if val is None:
            self._kv_client.insert_collection_data(
                self._collection, {"_key": key, "value": json.dumps(state)},
                self._appname)
        else:
            self._kv_client.update_collection_data(
                self._collection, key, {"value": json.dumps(state)},
                self._appname)

    def update_state_in_batch(self, states):
        self._kv_client.update_collection_data_in_batch(
            self._collection, states, self._appname)

    def delete_state(self, key):
        try:
            self._kv_client.delete_collection_data(
                self._collection, key, self._appname)
        except kvc.KVNotExists:
            pass

    def get_state(self, key):
        try:
            state = self._kv_client.get_collection_data(
                self._collection, key, self._appname)
        except kvc.KVNotExists:
            return None

        if "value" in state:
            value = state["value"]
        else:
            value = state

        try:
            value = json.loads(value)
        except Exception:
            pass

        return value

    def get_all_states(self):
        states = self._kv_client.get_collection_data(
            self._collection, None, self._appname)

        if not states:
            return

        ckpts = {}
        for state in states:
            if "value" in state:
                value = state["value"]
            else:
                value = state

            try:
                value = json.loads(value)
            except Exception:
                pass

            ckpts[state["_key"]] = value
        return ckpts

    def delete_all_states(self):
        self._kv_client.delete_collection(self._collection, self._appname)


class FileStateStore(BaseStateStore):

    def __init__(self, meta_configs, appname):
        """
        :meta_configs: dict like and contains checkpoint_dir, session_key,
        server_uri etc
        """

        super(FileStateStore, self).__init__(meta_configs, appname)

    def update_state(self, key, state):
        """
        :state: Any JSON serializable
        :return: None if successful, otherwise throws exception
        """

        fname = op.join(self._meta_configs["checkpoint_dir"], key)
        with open(fname + ".new", "w") as jsonfile:
            json.dump(state, jsonfile)
            jsonfile.flush()

        if op.exists(fname):
            try:
                os.remove(fname)
            except IOError:
                pass

        os.rename(fname + ".new", fname)

    def update_state_in_batch(self, states):
        for state in states:
            self.update_state(state["_key"], state["value"])

    def get_state(self, key):
        fname = op.join(self._meta_configs["checkpoint_dir"], key)
        if op.exists(fname):
            try:
                with open(fname) as jsonfile:
                    state = json.load(jsonfile)
                    return state
            except IOError:
                return None
        else:
            return None

    def delete_state(self, key):
        fname = op.join(self._meta_configs["checkpoint_dir"], key)
        if op.exists(fname):
            try:
                os.remove(fname)
            except IOError:
                pass

    def get_all_states(self):
        return None

    def delete_all_states(self):
        pass


if __name__ == "__main__":
    mystate = {
        "x": "y",
    }
    key = "hello"
    states = [{"_key": "h", "value": "i"}, {"_key": "j", "value": "k"}]

    collection = "testing"
    config = {
        "use_kv_store": False,
        "checkpoint_dir": ".",
        "server_uri": "https://localhost:8089",
        "session_key": os.environ["session_key"],
    }

    appname = "Splunk_TA_aws"

    for use_kv in (False, True):
        store = get_state_store(config, appname, collection, use_kv)
        store.delete_state(key)

        res = store.get_state(key)
        assert(res is None)

        store.update_state(key, mystate)
        res = store.get_state(key)
        assert "x" in res and res["x"] == "y"

        store.delete_state(key)
        res = store.get_state(key)
        assert(res is None)

        store.update_state_in_batch(states)
        for state in states:
            s = store.get_state(state["_key"])
            assert s == state["value"]
            store.delete_state(state["_key"])

    collection = "pithoslogreader_pithoslabs-logs-infra5719"
    store = get_state_store(config, appname, collection, True)
    store._kv_client.delete_collection(collection, appname)
