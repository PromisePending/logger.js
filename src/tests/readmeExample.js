const { Logger, ConsoleEngine } = require('../../build/src');

const logger = new Logger({
   // Adds a basic string prefix
  prefixes: ['Logger.JS',
    // And a complex prefix
    {
      // Prefix text
      content: 'This prefix has complex colors',
      /* This function sets the color of the prefix text, the txt parameter is the content value and it must return a array whos size is equal to the amount of letters in the content value.
      NOTE: color doesn't need to be a function, it can be a array, or a string! If it is an array then its size must match the amount of letters of the content value, however, if it is a string then the hex code will be used to paint the whole text */
      color: (txt) => {
        // In this example we set a list of hex colors and repeat it to match the amount of letters
        const colors = ['#ff5555', '#55ff55', '#5555ff'];
        return txt.split('').map((_, i) => {
          return colors[i % colors.length];
        });
      },
      // Background color follows the same logic as color, it can be a function, an array or a string
      backgroundColor: '#000033',
    }
  ],
  // Disables fatal crashing, so that fatal logs won't immediatly end the process
  disableFatalCrash: true,
  // Makes the message of the log also be colored
  allLineColored: true,
});

logger.registerListener(new ConsoleEngine({
  debug: true,
}));

logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message');
logger.debug('This is a debug message');
logger.fatal('This is a fatal message');
