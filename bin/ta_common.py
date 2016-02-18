import sys
import time

import splunktalib.common.util as scutil


scutil.disable_stdout_buffer()


def validate_config():
    """
    Validate inputs.conf
    """

    return 0


def usage():
    """
    Print usage of this binary
    """

    hlp = "%s --scheme|--validate-arguments|-h"
    print >> sys.stderr, hlp % sys.argv[0]
    sys.exit(1)


def print_scheme(title, description):
    """
    Feed splunkd the TA's scheme
    """

    print """
    <scheme>
    <title>{title}</title>
    <description>{description}</description>
    <use_external_validation>true</use_external_validation>
    <streaming_mode>xml</streaming_mode>
    <use_single_instance>true</use_single_instance>
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
    </scheme>""".format(title=title, description=description)


def main(scheme_printer, run):
    args = sys.argv
    if len(args) > 1:
        if args[1] == "--scheme":
            scheme_printer()
        elif args[1] == "--validate-arguments":
            sys.exit(validate_config())
        elif args[1] in ("-h", "--h", "--help"):
            usage()
        else:
            usage()
    else:
        run()


def setup_signal_handler(loader, logger):
    """
    Setup signal handlers
    @data_loader: data_loader.DataLoader instance
    """

    def _handle_exit(signum, frame):
        logger.info("Exit signal received, exiting...")
        loader.tear_down()

    scutil.handle_tear_down_signals(_handle_exit)


def get_file_change_handler(loader, logger):
    def reload_and_exit(changed_files):
        logger.info("Conf file(s)=%s changed, exiting...", changed_files)
        loader.tear_down()

    return reload_and_exit


def sleep_until(interval, condition):
    """
    :interval: integer
    :condition: callable to check if need break the sleep loop
    :return: True when during sleeping condition is met, otherwise False
    """

    for _ in range(interval):
        time.sleep(1)
        if condition():
            return True
    return False
