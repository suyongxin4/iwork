#!/usr/bin/python

"""
This is the main entry point for iWork TA
"""

import time
import copy

import iwork_consts as c
from splunktalib.common import log

# logger should be init at the very begging of everything
logger = log.Logs(c.iwork_log_ns).get_logger(c.iwork_log)


import splunktalib.common.pattern as scp
import splunktalib.data_loader_mgr as dlm
import ta_common as tac

import iwork_config as iconfig
import iemail
import icalendar


def print_scheme():
    tac.print_scheme("Splunk AddOn for Exchange calendar/email", "For fun")


def create_jobs(task):
    if task[c.name] == c.icalendar_settings:
        return [icalendar.OutlookCalendarDataLoader(task)]
    elif task[c.name] == c.iemail_settings:
        # Expand email by folder
        folders = iemail.get_folders(task)
        jobs = []
        for folder in folders:
            ctask = copy.copy(task)
            ctask[c.folders] = [folder]
            jobs.append(iemail.OutlookEmailDataLoader(ctask))
        return jobs
    else:
        assert 0 and "Invalid task"


@scp.catch_all(logger)
def _do_run():
    config = iconfig.IWorkConfig()
    tasks = config.get_tasks()
    if not tasks:
        logger.info("No data input has been configured, exiting...")
        return

    loader_mgr = dlm.create_data_loader_mgr(config.metas())
    tac.setup_signal_handler(loader_mgr, logger)
    conf_change_handler = tac.get_file_change_handler(loader_mgr, logger)
    conf_monitor = iconfig.create_conf_monitor(conf_change_handler)
    loader_mgr.add_timer(conf_monitor, time.time(), 10)

    jobs = [job for task in tasks for job in create_jobs(task)]
    loader_mgr.run(jobs)


def run():
    """
    Main loop. Run this TA forever
    """

    logger.info("Start iwork")
    _do_run()
    logger.info("End iwork")


def main():
    """
    Main entry point
    """

    tac.main(print_scheme, run)


if __name__ == "__main__":
    main()
