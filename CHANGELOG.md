# v1.1.1: Saving Everything (patch)
  - [FIXED] Fixed a bug that caused logs that passed arguments to log the same thing twice

  - [FIXED] Fixed typescript types for the `Logger` class

  - [FIXED] Fixed an issue that caused having two logger instances logging to the same folder to cause a crash when the second instance tried to close the file stream

  - [FIXED] Zip files timestamp now reflects the last modified time of the latest log file instead of the time of the zip creation

  - [UPDATE] Fatal logs now are saved per fatal crash, instead of all fatal crashes of the same execution being saved to the same file

  - [UPDATE] Fatal logs now have a 4 character random code at the start of the file name to prevent overwriting of files

  - [UPDATE] Zip files now have a 4 character random code at the start of the file name to prevent overwriting of files

# v1.1.0: Saving Everything
  - [NEW] Added support for logging to a file

  - [NEW] Added the `fileProperties` parameter to the `Logger` constructor which includes the following properties:

    - enable: enable logging to a file (defaults to `false`) [If `false` all the other properties will be ignored]

    - logFolderPath: path to the folder where the log files will be stored (will be created if it doesn't exist, defaults to `./logs`)

    - enableLatestLog?: if true, the latest log file will be stored in the `logFolderPath` with the name `latest.log` (defaults to `true`)

    - enableDebugLog?: if true, the debug log will be stored in the `logFolderPath` inside a folder named `latestLogs` with the name `debug.log` (defaults to `true`)

    - enableErrorLog?: if true, the error log will be stored in the `logFolderPath` inside a folder named `latestLogs` with the name `error.log` (defaults to `false`)

    - enableFatalLog?: if true, the fatal log will be stored in the `logFolderPath` inside a folder named `fatal-crash` with the name `fatal-DATE.log` (defaults to `true`)

    - generateHTMLLog?: if true, the log files will be generated in HTML format (their extension will change from .log to .html) (defaults to `false`)

    - compressLogFilesAfterNewExecution?: if true, the log files will be compressed to a zip file after a new execution of the program (defaults to `true`)

  - [NEW] Added support to log objects, arrays and etc. Like the default `console.log` function.

  - [BREAKING] Changed the export of AutoLogEnd now importing the package will return the `Logger` class and a object named `AutoLogEnd` with the `activate` and `deactivate` functions.

  - [NEW] AutoLogEnd `activate` function now accepts a `Logger` instance as 2º parameter. If not passed it will create a new instance of `Logger` with the default parameters. otherwise it will use the passed instance.

# v1.0.0: Logging Everything

- [NEW] Initial release of logger

  - Supports Warning, Error, Info, Debug, and Fatal logging levels

  - Supports colored output if specified
