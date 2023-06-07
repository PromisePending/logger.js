# V1.1
  - Added support for logging to a file

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

# V1.0

- Initial release of logger
  - Supports Warning, Error, Info, Debug, and Fatal logging levels
  - Supports colored output if specified
