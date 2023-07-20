import { ILoggerOptions, ELoggerLevel, ILoggerFileProperties, ELoggerLevelNames, ELoggerLevelBaseColors, ELoggerLevelAlternateColors } from './interfaces';
import escape from 'escape-html';
import admZip from 'adm-zip';
import chalk from 'chalk';
import Path from 'path';
import fs from 'fs';
import utils from 'util';

export class Logger {
  private defaultLevel: ELoggerLevel = ELoggerLevel.LOG;
  private debugActive = false;
  private prefix?: string;
  private coloredBackground: boolean;
  private disableFatalCrash: boolean;
  private allLineColored: boolean;
  private fileProperties: ILoggerFileProperties;
  private latestFileStream?: fs.WriteStream;
  private debugLogStream?: fs.WriteStream;
  private errorLogStream?: fs.WriteStream;
  private fatalLogStream?: fs.WriteStream;
  private htmlBackgroundColor: string;
  private htmlTextColor: string;

  constructor({ prefix, debug, defaultLevel, coloredBackground, disableFatalCrash, allLineColored, fileProperties }: ILoggerOptions) {
    this.prefix = prefix ?? '';
    this.debugActive = debug ?? false;
    this.defaultLevel = defaultLevel ?? ELoggerLevel.INFO;
    this.coloredBackground = coloredBackground ?? false;
    this.disableFatalCrash = disableFatalCrash ?? false;
    this.allLineColored = allLineColored ?? false;

    this.htmlBackgroundColor = '#0a002b';
    this.htmlTextColor = '#ffffff';

    this.fileProperties = {
      enable: false,
      logFolderPath: Path.join(__dirname, 'logs'),
      enableLatestLog: true,
      enableDebugLog: false,
      enableErrorLog: false,
      enableFatalLog: true,
      generateHTMLLog: false,
      compressLogFilesAfterNewExecution: true,
    };

    this.fileProperties = { ...this.fileProperties, ...fileProperties ?? {} };

    if (this.fileProperties.enable) {
      // create log folder if not exists
      if (!fs.existsSync(this.fileProperties.logFolderPath)) fs.mkdirSync(this.fileProperties.logFolderPath);
      else this.compressLastSessionLogs();

      // creates folders for fatal-crash and latest logs
      if (!fs.existsSync(Path.join(this.fileProperties.logFolderPath, 'fatal-crash'))) fs.mkdirSync(Path.join(this.fileProperties.logFolderPath, 'fatal-crash'));
      if (!fs.existsSync(Path.join(this.fileProperties.logFolderPath, 'latestLogs'))) fs.mkdirSync(Path.join(this.fileProperties.logFolderPath, 'latestLogs'));

      // eslint-disable-next-line max-len
      const defaultHeader = `<body style="--txtBackground: ${this.htmlBackgroundColor}; color: ${this.htmlTextColor}; background: ${this.htmlBackgroundColor}; margin: 0;padding: 0.25rem;display:flex;flex-direction:column;"><style>* {padding: 0.15rem 0;} body > span {position: relative;display: flex;flex-direction: row;} span > span {height: 100%;display: block;padding: 0;width: 100%;box-shadow: 0 0 0 0.16rem var(--txtBackground)} .pre {width: fit-content;white-space: nowrap;box-shadow: none;}</style>\n`;

      if (this.fileProperties.enableLatestLog) {
        this.latestFileStream = fs.createWriteStream(
          Path.join(this.fileProperties.logFolderPath, `latest.${this.fileProperties.generateHTMLLog ? 'html' : 'log'}`), { flags: 'a' },
        );
        if (this.fileProperties.generateHTMLLog) this.latestFileStream.write(defaultHeader);
      }
      if (this.fileProperties.enableDebugLog) {
        this.debugLogStream = fs.createWriteStream(
          Path.join(this.fileProperties.logFolderPath, 'latestLogs', `debug.${this.fileProperties.generateHTMLLog ? 'html' : 'log'}`), { flags: 'a' },
        );
        if (this.fileProperties.generateHTMLLog) this.debugLogStream.write(defaultHeader);
      }
      if (this.fileProperties.enableErrorLog) {
        this.errorLogStream = fs.createWriteStream(
          Path.join(this.fileProperties.logFolderPath, 'latestLogs', `error.${this.fileProperties.generateHTMLLog ? 'html' : 'log'}`), { flags: 'a' },
        );
        if (this.fileProperties.generateHTMLLog) this.errorLogStream.write(defaultHeader);
      }
      if (this.fileProperties.enableFatalLog) {
        this.fatalLogStream = fs.createWriteStream(
          Path.join(this.fileProperties.logFolderPath, 'fatal-crash', `fatal-latest.${this.fileProperties.generateHTMLLog ? 'html' : 'log'}`), { flags: 'a' },
        );
        if (this.fileProperties.generateHTMLLog) this.fatalLogStream.write(defaultHeader);
      }

      // handles process exists to properly close the streams
      process.on('exit', this.closeFileStreams.bind(this, 'Process exited', undefined));
    } else {
      this.fileProperties.enableLatestLog = false;
      this.fileProperties.enableDebugLog = false;
      this.fileProperties.enableErrorLog = false;
      this.fileProperties.enableFatalLog = false;
      this.fileProperties.generateHTMLLog = false;
      this.fileProperties.compressLogFilesAfterNewExecution = false;
    }
  }

  private closeFileStreams(closeStreamMessage?: string, customFatalMessage?: string): void {
    if (this.latestFileStream) this.latestFileStream.end(closeStreamMessage?.toString());
    if (this.debugLogStream) this.debugLogStream.end(closeStreamMessage?.toString());
    if (this.errorLogStream) this.errorLogStream.end(closeStreamMessage?.toString());
    if (this.fatalLogStream) {
      this.fatalLogStream?.end((customFatalMessage ?? closeStreamMessage)?.toString());
      // rename the file from fatal-latest.log to fatal-<timestamp>.log
      fs.renameSync(
        Path.resolve(this.fileProperties.logFolderPath, 'fatal-crash', `fatal-latest.${this.fileProperties.generateHTMLLog ? 'html' : 'log'}`),
        Path.resolve(this.fileProperties.logFolderPath, 'fatal-crash', `fatal-${this.getTime(true, true)}.${this.fileProperties.generateHTMLLog ? 'html' : 'log'}`),
      );
    }
  }

  private writeToAllStreams(message: string, customFatalLog?: string): void {
    if (this.fileProperties.enableLatestLog) this.latestFileStream?.write(message);
    if (this.fileProperties.enableDebugLog) this.debugLogStream?.write(message);
    if (this.fileProperties.enableErrorLog) this.errorLogStream?.write(message);
    if (this.fileProperties.enableFatalLog) this.fatalLogStream?.write(customFatalLog ?? message);
  }

  private compressLastSessionLogs(): void {
    if (!this.fileProperties.compressLogFilesAfterNewExecution) return;

    const zip = new admZip();

    var files = fs.readdirSync(this.fileProperties.logFolderPath);
    // const fatalCrashFiles = fs.readdirSync(Path.join(this.fileProperties.logFolderPath, 'fatal-crash'));
    const latestLogsFiles = fs.readdirSync(Path.join(this.fileProperties.logFolderPath, 'latestLogs'));
    // files = files.concat(fatalCrashFiles.map((file) => Path.join('fatal-crash', file)));
    files = files.concat(latestLogsFiles.map((file) => Path.join('latestLogs', file)));
    files.forEach((file) => {
      if (file.endsWith('.log') || file.endsWith('.html')) {
        zip.addLocalFile(Path.join(this.fileProperties.logFolderPath, file));
        // don't delete fatal-crash logs
        if (!file.startsWith('fatal')) fs.unlinkSync(Path.join(this.fileProperties.logFolderPath, file));
      }
    });

    fs.writeFileSync(Path.resolve(this.fileProperties.logFolderPath, `logs-${this.getTime(true, true)}.zip`), zip.toBuffer());
  }

  private getFormattedPrefix(): string {
    var prefix = '';
    prefix += chalk.hex('#5c5c5c')('[');
    prefix += chalk.gray(this.prefix);
    prefix += chalk.hex('#5c5c5c')(']');

    return this.prefix !== '' ? prefix : '';
  }

  private getTime(fullDate?: boolean, friendlySymbols?: boolean): string {
    const time = new Date(Date.now());
    const day = time.getDate() < 10 ? '0' + time.getDate() : time.getDate();
    const month = time.getMonth() < 10 ? '0' + time.getMonth() : time.getMonth();
    const year = time.getFullYear();
    const seconds = time.getSeconds() < 10 ? '0' + time.getSeconds() : time.getSeconds();
    const minutes = time.getMinutes() < 10 ? '0' + time.getMinutes() : time.getMinutes();
    const hours = time.getHours() < 10 ? '0' + time.getHours() : time.getHours();

    // eslint-disable-next-line max-len
    return `${friendlySymbols ? '' : '['}${fullDate ? day : ''}${fullDate ? (friendlySymbols ? '-' : ':') : ''}${fullDate ? month : ''}${fullDate ? (friendlySymbols ? '-' : ':') : ''}${fullDate ? year : ''}${fullDate ? (friendlySymbols ? 'T' : '-') : ''}${hours}${friendlySymbols ? '-' : ':'}${minutes}${friendlySymbols ? '-' : ':'}${seconds}${friendlySymbols ? '' : ']'}`;
  }

  private generateMessagePrefix(level: ELoggerLevel): { coloredMessagePrefix: string; rawMessagePrefix: string, textColor: string } {
    const fgColor = [ELoggerLevelBaseColors[level], ELoggerLevelAlternateColors[level]];
    var time = chalk.hex(fgColor[Number(this.coloredBackground)])(this.getTime() + ' ');
    var prefix = chalk.hex(fgColor[Number(this.coloredBackground)])(this.getFormattedPrefix() + ' ');
    var levelText = chalk.hex(fgColor[Number(this.coloredBackground)])(ELoggerLevelNames[level].toUpperCase() + ':');

    if (this.coloredBackground) {
      time = chalk.bgHex(ELoggerLevelBaseColors[level])(time);
      prefix = chalk.bgHex(ELoggerLevelBaseColors[level])(prefix);
      levelText = chalk.bgHex(ELoggerLevelBaseColors[level])(levelText);
    }

    return {
      coloredMessagePrefix: `${time}${prefix}${levelText}`,
      rawMessagePrefix: `${this.getTime()} [${this.prefix}] ${ELoggerLevelNames[level].toUpperCase()}:`,
      textColor: fgColor[Number(this.coloredBackground)],
    };
  }

  log(text: any, levelToLog?: ELoggerLevel, ...args: any): void {
    const level = levelToLog ?? this.defaultLevel;
    var stackTrace = '';
    if (text instanceof Error) {
      stackTrace = text.stack ?? '';
      text = text.toString();
    }
    text = utils.format(text, ...args);
    if (level === ELoggerLevel.FATAL) return this.fatal(text, ...args);
    const consoleLevels = {
      [ELoggerLevel.INFO]: console.log,
      [ELoggerLevel.WARN]: console.warn,
      [ELoggerLevel.ERROR]: console.error,
      [ELoggerLevel.DEBUG]: console.debug,
    };

    const { coloredMessagePrefix, rawMessagePrefix, textColor } = this.generateMessagePrefix(level);

    const messageToConsole = (this.coloredBackground && this.allLineColored)
      ? chalk.bgHex(ELoggerLevelBaseColors[level])(chalk.hex(ELoggerLevelAlternateColors[level])(' ' + text))
      : (this.allLineColored ? chalk.hex(ELoggerLevelBaseColors[level])(' ' + text) : ' ' + text)
    ;

    if ((this.debugActive && level === ELoggerLevel.DEBUG) || (level !== ELoggerLevel.DEBUG)) {
      consoleLevels[level](coloredMessagePrefix + messageToConsole);
    }

    // escapes the text to a be secure to be used in html
    const escapedText = escape(text.toString());
    // escapes the stack trace and converts tabs to spaces and spaces to &nbsp; to be used in html
    const escapedStackTrace = '<span>' + escape(stackTrace).replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/ /g, '&nbsp;').split('\n').join('</span><span>') + '</span>';

    // eslint-disable-next-line max-len
    const textSpanElement = this.allLineColored ? `<span style="color: ${textColor}; ${this.coloredBackground ? 'background: ' + ELoggerLevelBaseColors[level] : ''}">${escapedText}</span>` : `<span style="color: ${this.htmlTextColor}; background: ${this.htmlBackgroundColor};">${escapedText}</span>`;
    // eslint-disable-next-line max-len
    const stackTraceSpanElement = this.allLineColored ? `<span style="color: ${textColor}; ${this.coloredBackground ? 'background: ' + ELoggerLevelBaseColors[level] : ''}">${escapedStackTrace}</span>` : `<span style="color: ${this.htmlTextColor}; background: ${this.htmlBackgroundColor};">${escapedStackTrace}</span>`;
    // eslint-disable-next-line max-len
    const parentSpanElement = `<span style="color: ${textColor}; ${this.coloredBackground ? 'background: ' + ELoggerLevelBaseColors[level] + ';' : ''}${(this.allLineColored && this.coloredBackground) ? '--txtBackground: ' + ELoggerLevelBaseColors[level] + ';' : ''}"><span class='pre'>${rawMessagePrefix}&nbsp;</span>${textSpanElement}</span>\n`;
    // eslint-disable-next-line max-len
    const parentStackTraceSpanElement = `<span style="color: ${textColor}; ${this.coloredBackground ? 'background: ' + ELoggerLevelBaseColors[level] + ';' : ''}${(this.allLineColored && this.coloredBackground) ? '--txtBackground: ' + ELoggerLevelBaseColors[level] + ';' : ''}"><span class='pre'>${rawMessagePrefix}&nbsp;</span>${stackTraceSpanElement}</span>\n`;

    if (this.fileProperties.enableDebugLog) {
      this.debugLogStream?.write(this.fileProperties.generateHTMLLog ? parentSpanElement : (rawMessagePrefix + ' ' + text + '\n'));
    }
    if (this.fileProperties.enableErrorLog && level === ELoggerLevel.ERROR) {
      // eslint-disable-next-line max-len
      this.errorLogStream?.write(this.fileProperties.generateHTMLLog ? (stackTrace ? parentStackTraceSpanElement : parentSpanElement) : (rawMessagePrefix + ' ' + (stackTrace ?? text) + '\n'));
    }
    if (this.fileProperties.enableLatestLog && level !== ELoggerLevel.DEBUG) {
      this.latestFileStream?.write(this.fileProperties.generateHTMLLog ? parentSpanElement : (rawMessagePrefix + ' ' + text + '\n'));
    }
    if (this.fileProperties.enableFatalLog && level !== ELoggerLevel.DEBUG) {
      // write all logs to the fatal log file (including stack traces from non fatal logs) EXCEPT debug logs
      // eslint-disable-next-line max-len
      this.fatalLogStream?.write(this.fileProperties.generateHTMLLog ? (stackTrace ? parentStackTraceSpanElement : parentSpanElement) : (rawMessagePrefix + ' ' + (stackTrace ?? text) + '\n'));
    }
  }

  info(text: any, ...args: any): void {
    this.log(text, ELoggerLevel.INFO, ...args);
  }

  warn(text: any, ...args: any): void {
    this.log(text, ELoggerLevel.WARN, ...args);
  }

  error(text: any, ...args: any): void {
    this.log(text, ELoggerLevel.ERROR, ...args);
  }

  debug(text: any, ...args: any): void {
    this.log(text, ELoggerLevel.DEBUG, ...args);
  }

  fatal(text: any, ...args: any): void {
    var message = text.toString();
    var stack: string[] | undefined = [];
    var fullString = text.toString();
    if (text instanceof Error) {
      // create stacktrace
      stack = text.stack?.split('\n');
      if (stack) {
        fullString = stack.join('\n');
        message = stack.shift() ?? '';
      }
    }

    message = utils.format(message, ...args);

    const time = this.getTime();
    const prefix = this.getFormattedPrefix();
    const levelMsg = text.toString().startsWith('Error') ? ELoggerLevelNames[3] : `${ELoggerLevelNames[3]} ${ELoggerLevelNames[2]}:`;

    message = `${time} ${prefix} ${levelMsg} ${message.toString()}${stack ? '\n' + stack.join('\n') : ''}`;

    const msg = chalk.bgWhite(chalk.redBright(message));

    var escapedFullText = escape(fullString);
    const escapedText = escape(text.toString());

    // convert tabs to html
    escapedFullText = escapedFullText.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    escapedFullText = escapedFullText.replace(/ /g, '&nbsp;');

    const splitFullEscapedText = escapedFullText.split('\n');
    const htmlFullText = '<span>' + splitFullEscapedText.join('</span><span>') + '</span>';

    const textSpan = `<span style="color: ${ELoggerLevelAlternateColors[3]}; background: ${ELoggerLevelBaseColors[3]};">${escapedText}</span>`;
    const fullSpan = `<span style="color: ${ELoggerLevelAlternateColors[3]}; background: ${ELoggerLevelBaseColors[3]};">${htmlFullText}</span>`;
    // eslint-disable-next-line max-len
    const prefixSpan = `<span style="color: ${ELoggerLevelAlternateColors[3]}; background: ${ELoggerLevelBaseColors[3]};--txtBackground: ${ELoggerLevelBaseColors[3]};"><span class='pre'>${time} [${this.prefix}] ${levelMsg}&nbsp;</span>${textSpan}</span>\n`;
    // eslint-disable-next-line max-len
    const fullPrefixSpan = `<span style="color: ${ELoggerLevelAlternateColors[3]}; background: ${ELoggerLevelBaseColors[3]};--txtBackground: ${ELoggerLevelBaseColors[3]};"><span class='pre'>${time} [${this.prefix}] ${levelMsg}&nbsp;</span>${fullSpan}</span>\n`;

    // eslint-disable-next-line max-len
    const finalMessage = (this.fileProperties.generateHTMLLog ? prefixSpan : (time + ' [' + this.prefix + '] ' + levelMsg + ' ' + text + '\n')) + 'Please check the fatal log file for more details.\n';
    const finalFatalMessage = this.fileProperties.generateHTMLLog ? fullPrefixSpan : (time + ' [' + this.prefix + '] ' + levelMsg + ' ' + fullString + '\n');

    if (this.disableFatalCrash) {
      this.writeToAllStreams(finalMessage, finalFatalMessage);
    } else {
      this.closeFileStreams(finalMessage, finalFatalMessage);
    }

    console.error(msg);

    if (!this.disableFatalCrash) {
      process.exit(5);
    }
  }
}
