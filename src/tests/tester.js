const logger = require('../../build');

const log = new logger.Logger({
  prefix: 'TESTER',
  debug: true,
  coloredBackground: true,
  allLineColored: true,
  disableFatalCrash: true,
  fileProperties: {
    enable: true,
    logFolderPath: './logs1',
    enableLatestLog: true,
    enableDebugLog: true,
    enableErrorLog: true,
    enableFatalLog: true,
    generateHTMLLog: false,
    compressLogFilesAfterNewExecution: true,
  },
});

log.debug('Hello world!');
log.info('Hello world!');
log.warn('Hello world!');
log.error('Hello world!');
log.fatal('Hello world!');
