const { Logger, FileStorageEngine, ConsoleEngine, AutoLogEnd } = require('../../build/src');
const path = require('path');

console.time('Test execution time');

// Creates a logger instance
const logger = new Logger({
  // adds a basic string prefix
  prefixes: ['Logger.JS',
    // and a complex long prefix
    {
      // prefix text
      content: 'This is a stupidly long prefix :)',
      // this function sets the color of the prefix text, the txt parameter is the content value
      // and it must return a array whos size is equal to the amount of letters in the content value
      // NOTE: color doesn't need to be a function, it can be a array, or a string!
      // if it is an array then its size must match the amount of letters of the content value, however
      // if it is a string then its hex code is used to paint the whole text
      color: (txt) => {
        // in this example we set a list of hex colors and repeat it to match the amount of letters
        const colors = ['#ff5555', '#55ff55', '#5555ff'];
        return txt.split('').map((t, i) => {
          return colors[i % colors.length];
        });
      },
      // background color followes the same logic as color, it can be a function, an array or a string
      backgroundColor: '#553311',
    }
  ],
  // disables fatal crash so that fatal logs won't immediatly end the process
  disableFatalCrash: true,
  // makes the message of the log also be colored
  allLineColored: true,
  redactedContent: ['true'],
});

// Creates and registers a ConsoleEngine, all logs will now be displayed on the terminal
logger.registerListener(new ConsoleEngine({
  debug: true,
}));

// Iniciates the AutoLogEnd singleton, this allows us to set custom routines to be executed before
// our program exits, but also will automaticly be used by the FileStorageEngines to close and
// rename the log files at the exit of the program.
// We are giving it our instance of logger, however this is optional and it could be instanciated
// without any parameter, where it would create its own instance of a logger and Console engine
// by giving it our instance however this means any log done by it will have our prefixes and will
// trigger the registered engines
new AutoLogEnd(logger);

// NOTE: it is always recommended to create AutoLogEnd before any FileStorageEngine
// as FileStorageEngine automaticly registers it deconstructor if AutoLogEnd already exists

// Creates and registers a FileStorageEngine, all logs from now on will be saved on disk!
logger.registerListener(new FileStorageEngine({
  debug: true,
  logFolderPath: path.resolve(__dirname, 'logs'),
  enableDebugLog: true,
  enableErrorLog: true,
  enableFatalLog: true,
  compressLogFilesAfterNewExecution: true,
}));

// Regular usage
logger.info('Hello, World!');
logger.warn('Hello, World!');
logger.error('Hello, World!');
logger.fatal('Hello, World!');
logger.debug('Hello, World!');

// Using template literals
logger.info`Hello, ${'World'}`;
logger.warn`Hello, ${'World'}`;
logger.error`Hello, ${'World'}`;
logger.fatal`Hello, ${'World'}`;
logger.debug`Hello, ${'World'}`;

// Logging different data types
const myObj = {
  kind: 'example',
  bool: true,
  number: 1,
  nested: {
    result: 'yes',
    happy: true,
  },
}

const myArray = [1,2,3,4,5,6,7,8,9,10];
const myErr = new Error('Example Error', {
  cause: new Error('Another Error', {
    cause: myObj
  }),
});

logger.info(myObj);
logger.warn('The object ->', myObj);
logger.error`Yes an object -> ${myObj}`;
logger.info(myArray);
logger.warn('The array ->', myArray);
logger.error`Yes an array -> ${myArray}`;
logger.error(myErr);
logger.error('The error ->', myErr);
logger.error`Yes an error -> ${myErr}`;
logger.error(myObj, myArray, myErr);
logger.warn`${myObj}, ${myErr}, ${myArray}`;
logger.info('And last\nBut not least\nMultiline Example!');

console.timeEnd('Test execution time');
