<h1 align="center">Logger.JS</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@promisepending/logger.js">
    <img src="https://img.shields.io/npm/v/@promisepending/logger.js.svg?style=flat-square" alt="NPM Version" />
  </a>
  <a href="https://www.npmjs.com/package/@promisepending/logger.js">
    <img src="https://img.shields.io/npm/dm/@promisepending/logger.js.svg?style=flat-square" alt="NPM Downloads" />
  </a>
  <a href="">
    <img src="https://img.shields.io/github/license/PromisePending/logger.js?style=flat-square&color=0394fc&label=Licen%C3%A7a" alt="License" />
  </a>
  <a href="https://discord.gg/qUMUJW2XgF">
    <img src="https://img.shields.io/discord/866707606433562634?style=flat-square&color=7289da&logo=discord&logoColor=FFFFFF"/>
  </a>
</p>

#

<h2 align="center">📖 About</h2>
&nbsp;&nbsp;&nbsp;&nbsp;A simple to use but powerful logger library for NodeJS, made with TypeScript, capable of making beautiful and well organized logs automagically.

<br>

&nbsp;&nbsp;&nbsp;&nbsp;Originally a small util for [twitch.js](https://github.com/PromisePending/twitch.js), Logger.js quickly expanded to other projects and started gaining more features, and now it stands as a standalone package to be used by anyone.

<br>

<h2 align="center">📦 Installing</h2>
&nbsp;&nbsp;&nbsp;&nbsp;To install Logger.JS in your project, you need first to have NodeJS installed (version 20 is recommended), then use the following command to install Logger.js as a dependency on your project:

<br>

### NPM:
```
npm install @promisepending/logger.js
```

<br>

### Yarn:
```
yarn add @promisepending/logger.js
```

<br>

<h2 align="center">⌨ Usage example</h2>
&nbsp;&nbsp;&nbsp;&nbsp;To use Logger.JS in your project, first import the Logger Class as well as the Engines that you will be using, then create instances of those classes, passing as parameter your configurations as an object.

<br>

The instanciation order doesn't matter since both the Logger class as well as the Engine classes provide methods to dynamically add or remove connections.

<br>

```js
import { Logger, ConsoleEngine } from '@promisepending/logger.js';

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
```

<br>

Then either before or after the Logger instanciation, instaciate the Engine(s).

```js
// Creates and registers a ConsoleEngine, all logs will now be displayed on the terminal
logger.registerListener(new ConsoleEngine({
  debug: true,
}));
```

Note that we are using `logger.registerListener` however it is possible to just pass `logger` as a second parameter in the constructor of `ConsoleEngine`, but also call the `registerLogger` method of the Engine allowing you to create the Engine before the logger, or even dynamically add loggers to the Engine.

<br>

You can use the methods of the `logger` object we just create to log your messages, as shown below:

<br>

```js
logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message');
logger.debug('This is a debug message');
logger.fatal('This is a fatal message');
```

### Results:

<img alt="The result of the above logs in a Konsole terminal" src="https://raw.githubusercontent.com/PromisePending/logger.js/release/.github/assets/LoggerExample.png">

<br>

<h2 align="center">📝 License</h2>

&nbsp;&nbsp;&nbsp;&nbsp;This project is licensed under the MIT License - see the [LICENSE](/LICENSE) file for details.

<br>

<h2 align="center">📜 Changelog</h2>

&nbsp;&nbsp;&nbsp;&nbsp;See the [CHANGELOG](/CHANGELOG.md) file for details.

<br>

<h2 align="center">🤝 Contributing</h2>

&nbsp;&nbsp;&nbsp;&nbsp;Contributions is what makes the open source community an amazing place and its a wonderful place to learn, inspire and create. Any contribution you make will be **very much appreciated**.

1. Make a Fork of the Project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<br>

<h2 align="center">😉 Authors</h2>

<br>

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/LoboMetalurgico">
        <img src="https://avatars.githubusercontent.com/u/43734867?v=4" width="100px;" alt="LoboMetlurgico's GitHub profile logo"/>
        <br />
        <sub>
          <b>LoboMetalurgico</b>
        </sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/emanuelfranklyn">
        <img src="https://avatars.githubusercontent.com/u/44732812?v=4" width="100px;" alt="SpaceFox's GitHub profile logo"/>
        <br />
        <sub>
          <b>SpaceFox</b>
        </sub>
      </a>
    </td>
  </tr>
</table>

#

<p align="center">Made with 💜 By PromisePending™'s team.</p>
