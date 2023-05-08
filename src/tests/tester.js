const logger = require('../../build');

const log = new logger.Logger({
  prefix: 'TESTER',
  debug: true,
  coloredBackground: true,
  allLineColored: true,
  disableFatalCrash: true,
  fileProperties: {
    enable: true,
    logFolderPath: './logs',
    enableLatestLog: true,
    enableDebugLog: true,
    enableErrorLog: true,
    enableFatalLog: true,
    generateHTMLLog: true,
    compressLogFilesAfterNewExecution: true,
  },
});

const ERROR = new Error('Example error');

log.debug(ERROR);
log.info(['Hello world!', 'This is a test!']);
log.warn('<h1>Hello world!</h1>');
log.error({ message: 'Hello world!', code: 500 });
log.fatal(ERROR);
log.debug('This happens after a fatal error!');
