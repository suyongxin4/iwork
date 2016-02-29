"""
Rest Handler
"""

from splunktalib.common import log
logger = log.Logs("splunk_ta_iwork").get_logger("rest", level="DEBUG")
log_enter_exit = log.log_enter_exit(logger)


import splunk
import splunk.admin


class ConfigHandler(splunk.admin.MConfigHandler):

    @log_enter_exit
    def setup(self):
        pass

    @log_enter_exit
    def handleList(self, confInfo):

        confInfo['result'].append("calendarList", [])
        confInfo['status'].append("error", 0)


@log_enter_exit
def main():
    splunk.admin.init(ConfigHandler, splunk.admin.CONTEXT_NONE)


if __name__ == '__main__':
    main()
