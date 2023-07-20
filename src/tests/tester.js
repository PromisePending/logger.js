const { Logger } = require('../../build');

const logger = new Logger({
  prefix: 'Logger.JS', // This will be the prefix of all logs (default: null)
  disableFatalCrash: true, // If true, the logger will not crash the process when a fatal error occurs (default: false)
  allLineColored: true, // If true, the whole line will be colored instead of only the prefix (default: false)
  coloredBackground: false, // If true, the background of the lines will be colored instead of the text (default: false)
  debug: false, // If true, the logger will log debug messages (default: false)
  fileProperties: { // This is the configuration of the log files
    enable: true, // If true, the logger will log to files (default: false) [NOTE: If false all below options will be ignored]
    logFolderPath: './logs', // This is the path of the folder where the log files will be saved (default: './logs')
    enableLatestLog: true, // If true, the logger will save the latest log in a file (default: true)
    enableDebugLog: true, // If true, the logger will save the debug logs in a file (default: false)
    enableErrorLog: true, // If true, the logger will save the error logs in a file (default: false)
    enableFatalLog: true, // If true, the logger will save the fatal logs in a file (default: true)
    generateHTMLLog: true, // If true, the logger will generate a HTML file with the logs otherwise a .log file (default: false)
    compressLogFilesAfterNewExecution: true, // If true, the logger will compress the log files to zip after a new execution (default: true)
  },
});

logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message');
logger.debug('This is a debug message');
logger.fatal('This is a fatal message');
