const logger = require('../../build');

const log = new logger.Logger({ debug: true, disableFatalCrash: true });

log.log('Hello world!');
log.debug('Hello world!');
log.info('Hello world!');
log.warn('Hello world!');
log.error('Hello world!');
log.fatal('Hello world!');
