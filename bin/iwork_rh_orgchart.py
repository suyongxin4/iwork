import json

import iwork_rest_import_guard as arig

import splunk.clilib.cli_common as scc
import splunk.admin as admin

import iwork_consts as c
from splunktalib.common import log
logger = log.Logs(c.splunk_app_iwork).get_logger("custom_rest")

import splunktalib.common.pattern as scp
import iwork_checkpointer as ckpt


class WorkOrgchartHandler(admin.MConfigHandler):
    key = "iwork_orgchart"
    valid_params = []

    def setup(self):
        for param in self.valid_params:
            self.supportedArgs.addOptArg(param)

    @scp.catch_all(logger)
    def handleList(self, conf_info):
        logger.info("start get iwork orgchart")

        config = {
            c.session_key: self.getSessionKey(),
            c.server_uri: scc.getMgmtUri(),
        }
        emp = ckpt.EmployeeDetailLookup(config)
        lookups = emp.all()
        conf_info[self.key].append(self.key, json.dumps(lookups))
        logger.info("end of getting iwork orgchart")


def main():
    admin.init(WorkOrgchartHandler, admin.CONTEXT_NONE)


if __name__ == "__main__":
    main()
