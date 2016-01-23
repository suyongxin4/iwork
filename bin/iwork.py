#!/usr/bin/python

"""
This is the main entry point for iWork TA
"""

import time
import traceback
import os

import iwork_consts as c
from splunktalib.common import log

# logger should be init at the very begging of everything
logger = log.Logs(c.iwork_log_ns).get_logger(c.iwork_log)


import splunktalib.common.pattern as scp
import splunktalib.data_loader_mgr as dlm

import iwork_config as iconfig
import iemail
import icalendar


def print_scheme():
    import sys

    scheme = """<scheme>
    <title>AWS S3</title>
    <description>Collect and index log files stored in AWS S3.</description>
    <use_external_validation>true</use_external_validation>
    <use_single_instance>true</use_single_instance>
    <streaming_mode>xml</streaming_mode>
    <endpoint>
        <args>
            <arg name="name">
              <title>Unique name which identifies this data input</title>
            </arg>
            <arg name="placeholder">
              <title>placeholder</title>
            </arg>
        </args>
    </endpoint>
    </scheme>"""
    sys.stdout.write(scheme)


@scp.catch_all(logger)
def _do_run():
    meta_configs, tasks = tacommon.get_configs(
        asconfig.AWSS3Conf, "aws_s3", logger)

    if not tasks:
        logger.info("No data input has been configured, exiting...")
        return

    meta_configs[tac.log_file] = asc.s3_log
    loader_mgr = dlm.create_data_loader_mgr(meta_configs)
    tacommon.setup_signal_handler(loader_mgr, logger)
    conf_change_handler = tacommon.get_file_change_handler(loader_mgr, logger)
    conf_monitor = asconfig.create_conf_monitor(conf_change_handler)
    loader_mgr.add_timer(conf_monitor, time.time(), 10)

    jobs = [asdl.S3DataLoader(task) for task in tasks]
    loader_mgr.run(jobs)


def run():
    """
    Main loop. Run this TA forever
    """

    logger.info("Start aws_s3")
    _do_run()
    logger.info("End aws_s3")


def main():
    """
    Main entry point
    """

    tacommon.main(print_scheme, run)


if __name__ == "__main__":
    main()
