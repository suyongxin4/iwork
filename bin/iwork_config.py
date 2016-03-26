import os.path as op

from splunktalib.common import log
import iwork_consts as c

logger = log.Logs().get_logger(c.iwork_log)

import splunktalib.conf_manager.ta_conf_manager as tcm
import splunktalib.modinput as mod
import splunktalib.file_monitor as fm


def create_conf_monitor(handler):
    curdir = op.join(op.dirname(op.dirname(op.abspath(__file__))), "local")
    files = [op.join(curdir, c.iwork + ".conf")]
    return fm.FileMonitor(handler, files)


class IWorkConfig(object):

    def __init__(self):
        metas, stanzas = mod.get_modinput_configs_from_stdin()
        self._metas, self._stanzas = metas, stanzas

    def metas(self):
        return self._metas

    def get_tasks(self):
        mgr = tcm.TAConfManager(
            c.iwork, self._metas[c.server_uri], self._metas[c.session_key],
            c.splunk_app_iwork)
        mgr.reload()
        mgr.set_encrypt_keys([c.password])
        stanzas = mgr.all(return_acl=False)
        log_level = stanzas[c.iwork_settings][c.log_level]
        log.Logs().set_level(log_level)

        tasks = []
        for k in [c.iemail_settings, c.icalendar_settings]:
            if k in stanzas and stanzas[k]:
                if not stanzas[k][c.username]:
                    continue

                interval = stanzas[k].get(c.polling_interval, 86400)
                stanzas[k][c.polling_interval] = int(interval)
                stanzas[k][c.username] = stanzas[k][c.username].replace(
                    "\\\\", "\\")
                stanzas[k].update(self._metas)
                tasks.append(stanzas[k])

        # encrypt
        mgr.set_encrypt_keys(None)
        stanzas = mgr.all(return_acl=False)
        mgr.set_encrypt_keys([c.password])
        for k in [c.iemail_settings, c.icalendar_settings]:
            if k in stanzas and stanzas[k]:
                if (stanzas[k][c.username] and stanzas[k][c.password]
                        and not mgr.is_encrypted(stanzas[k])):
                    mgr.update(stanzas[k])

        return tasks
