import json

import iwork_rest_import_guard as arig

import splunk.clilib.cli_common as scc
import splunk.admin as admin

import iwork_consts as c
from splunktalib.common import log
logger = log.Logs(c.splunk_ta_iwork).get_logger("custom_rest")

import splunktalib.common.pattern as scp
import splunktalib.conf_manager.ta_conf_manager as tcm


class WorkConfigHandler(admin.MConfigHandler):
    key = "iwork_settings"
    valid_params = [c.host, c.username, c.password, c.start_date,
                    c.polling_interval, c.index, key]

    def setup(self):
        for param in self.valid_params:
            self.supportedArgs.addOptArg(param)

    @scp.catch_all(logger)
    def handleList(self, conf_info):
        logger.info("start listing iwork settings")

        mgr = tcm.TAConfManager(
            c.iwork, scc.getMgmtUri(), self.getSessionKey(),
            c.splunk_ta_iwork)
        mgr.reload()
        mgr.set_encrypt_keys([c.password])
        stanzas = mgr.all(return_acl=False)
        result = {}
        for key in self.valid_params:
            if key is "password":
                continue
            result[key] = stanzas[c.iemail_settings].get(key)

        conf_info[self.key].append(self.key, json.dumps(result))
        logger.info("end of listing iwork settings")

    @scp.catch_all(logger)
    def handleEdit(self, conf_info):
        logger.info("start editing iwork settings")
        if not self.callerArgs or not self.callerArgs.get(self.key):
            logger.error("Missing iwork settings")
            raise Exception("Missing iwork settings")

        mgr = tcm.TAConfManager(
            c.iwork, scc.getMgmtUri(), self.getSessionKey(),
            c.splunk_ta_iwork)
        mgr.set_encrypt_keys([c.password])

        settings = json.loads(self.callerArgs[self.key][0])
        for stanza_name in (c.iemail_settings, c.icalendar_settings):
            settings[c.name] = stanza_name
            mgr.update(settings)
        logger.info("end of editing iwork settings")


def main():
    admin.init(WorkConfigHandler, admin.CONTEXT_NONE)


if __name__ == "__main__":
    main()
