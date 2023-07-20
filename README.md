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
&nbsp;&nbsp;&nbsp;&nbsp;This is a simple logger for NodeJS, made in TypeScript, with the objective of make beautiful and easy to read logs.

<br>

&nbsp;&nbsp;&nbsp;&nbsp;Originally made for [twitch.js](https://github.com/PromisePending/twitch.js), we decided to make it in a separate package, so that it can be used in other projects without the need to install the entire twitch.js package or copy and maintain the code.

<br>

<h2 align="center">📦 Installing</h2>
&nbsp;&nbsp;&nbsp;&nbsp;To install Logger.JS in your project, you need first to have NodeJS installed, then run the following command in your terminal:

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

<h2 align="center">⌨ Use example</h2>
&nbsp;&nbsp;&nbsp;&nbsp;To use Logger.JS in your project, you need to import the logger class, then create an instance of that class, passing as parameter your logger configurations as an object, or nothing if you want to use the default configurations.

<br>

```js
const { Logger } = require('@promisepending/logger.js');
// or
import { Logger } from '@promisepending/logger.js';

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
```

<br>

&nbsp;&nbsp;&nbsp;&nbsp;After creating the logger instance, you can use the methods to log your messages, as shown below:

<br>

```js
logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message');
logger.debug('This is a debug message');
logger.fatal('This is a fatal message');
```

### Results:

<img alt="The result of the above logs in a windows command prompt" src="https://raw.githubusercontent.com/PromisePending/logger.js/release/.github/assets/LoggerExample.png">

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
