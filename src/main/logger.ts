import { ILoggerOptions, ELoggerLevel, ILoggerFileProperties } from './interfaces';
import chalk from 'chalk';
import Path from 'path';
import fs from 'fs';
import admZip from 'adm-zip';

export class Logger {
  private defaultLevel: ELoggerLevel = ELoggerLevel.LOG;
  private debugActive = false;
  private prefix?: string;
  private coloredBackground: boolean;
  private BaseColors: any;
  private AlternateColors: any;
  private disableFatalCrash: boolean;
  private allLineColored: boolean;
  private fileProperties: ILoggerFileProperties;
  private latestFileStream?: fs.WriteStream;
  private debugLogStream?: fs.WriteStream;
  private errorLogStream?: fs.WriteStream;
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

    /**
     * log (root)
     * - fatal-crash/
     *    - fatal-dataDoCrash.log
     * - latestLogs/
     *    - debug.log (contém tudo, incluindo o debug)
     *    - error.log (contém apenas os erros)
     * - logs-<data>.zip (contém todos os logs gerados na sessão anterior)
     * - latest.log (contém tudo, exceto fatal (apenas resumo, sem stacktrace) e debug (exceto se o debug estiver ativado))
     */
    if (this.fileProperties.enable) {
      // create log folder if not exists
      if (!fs.existsSync(this.fileProperties.logFolderPath)) fs.mkdirSync(this.fileProperties.logFolderPath);
      else this.compressLastSessionLogs();

      // creates folders for fatal-crash and latest logs
      if (!fs.existsSync(Path.join(this.fileProperties.logFolderPath, 'fatal-crash'))) fs.mkdirSync(Path.join(this.fileProperties.logFolderPath, 'fatal-crash'));
      if (!fs.existsSync(Path.join(this.fileProperties.logFolderPath, 'latestLogs'))) fs.mkdirSync(Path.join(this.fileProperties.logFolderPath, 'latestLogs'));

      // eslint-disable-next-line max-len
      const defaultHeader = `<body style="--txtBackground: ${this.htmlBackgroundColor}; color: ${this.htmlTextColor}; background: ${this.htmlBackgroundColor}; margin: 0;padding: 0.25rem;display:flex;flex-direction:column;"><style>* {padding: 0.15rem 0;} body > span {position: relative;display: flex;flex-direction: row;align-items: center;} span > span {height: 100%;display: flex;align-items: center;flex-direction: row;padding: 0;width: 100%;box-shadow: 0 0 0 0.16rem var(--txtBackground)} .pre {width: fit-content;white-space: nowrap;box-shadow: none;}</style>\n`;

      if (this.fileProperties.enableLatestLog) {
        this.latestFileStream = fs.createWriteStream(
          Path.join(this.fileProperties.logFolderPath, `latest.${this.fileProperties.generateHTMLLog ? 'html' : 'log'}`), { flags: 'a' },
        );
        this.latestFileStream.write(defaultHeader);
      }
      if (this.fileProperties.enableDebugLog) {
        this.debugLogStream = fs.createWriteStream(
          Path.join(this.fileProperties.logFolderPath, 'latestLogs', `debug.${this.fileProperties.generateHTMLLog ? 'html' : 'log'}`), { flags: 'a' },
        );
        this.debugLogStream.write(defaultHeader);
      }
      if (this.fileProperties.enableErrorLog) {
        this.errorLogStream = fs.createWriteStream(
          Path.join(this.fileProperties.logFolderPath, 'latestLogs', `error.${this.fileProperties.generateHTMLLog ? 'html' : 'log'}`), { flags: 'a' },
        );
        this.errorLogStream.write(defaultHeader);
      }
    } else {
      this.fileProperties.enableLatestLog = false;
      this.fileProperties.enableDebugLog = false;
      this.fileProperties.enableErrorLog = false;
      this.fileProperties.enableFatalLog = false;
      this.fileProperties.generateHTMLLog = false;
      this.fileProperties.compressLogFilesAfterNewExecution = false;
    }

    // color for text or colored background
    this.BaseColors = {
      [ELoggerLevel.INFO]: '#cc80ff',
      [ELoggerLevel.WARN]: '#ff8a1c',
      [ELoggerLevel.ERROR]: '#ff4a4a',
      [ELoggerLevel.DEBUG]: '#555555',
    };

    // color for text on colored background
    this.AlternateColors = {
      [ELoggerLevel.INFO]: '#000000',
      [ELoggerLevel.WARN]: '#000000',
      [ELoggerLevel.ERROR]: '#000000',
      [ELoggerLevel.DEBUG]: '#D4D4D4',
    };
  }

  private compressLastSessionLogs(): void {
    if (!this.fileProperties.compressLogFilesAfterNewExecution) return;

    const zip = new admZip();

    var files = fs.readdirSync(this.fileProperties.logFolderPath);
    const fatalCrashFiles = fs.readdirSync(Path.join(this.fileProperties.logFolderPath, 'fatal-crash'));
    const latestLogsFiles = fs.readdirSync(Path.join(this.fileProperties.logFolderPath, 'latestLogs'));
    files = files.concat(fatalCrashFiles.map((file) => Path.join('fatal-crash', file)));
    files = files.concat(latestLogsFiles.map((file) => Path.join('latestLogs', file)));
    files.forEach((file) => {
      if (file.endsWith('.log') || file.endsWith('.html')) {
        zip.addLocalFile(Path.join(this.fileProperties.logFolderPath, file));
        // don't delete fatal-crash logs
        if (!file.startsWith('fatal')) fs.unlinkSync(Path.join(this.fileProperties.logFolderPath, file));
      }
    });

    const date = new Date(Date.now());
    const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    const month = date.getMonth() < 10 ? '0' + date.getMonth() : date.getMonth();
    const year = date.getFullYear();

    fs.writeFileSync(Path.resolve(this.fileProperties.logFolderPath, `logs-${year}-${month}-${day}-${this.getTime(true)}.zip`), zip.toBuffer());
  }

  private getFormattedPrefix(): string {
    var prefix = '';
    prefix += chalk.hex('#5c5c5c')('[');
    prefix += chalk.gray(this.prefix);
    prefix += chalk.hex('#5c5c5c')(']');

    return this.prefix !== '' ? prefix : '';
  }

  private getTime(friendlySymbols?: boolean): string {
    const time = new Date(Date.now());
    const seconds = time.getSeconds() < 10 ? '0' + time.getSeconds() : time.getSeconds();
    const minutes = time.getMinutes() < 10 ? '0' + time.getMinutes() : time.getMinutes();
    const hours = time.getHours() < 10 ? '0' + time.getHours() : time.getHours();
    return `${friendlySymbols ? '' : '['}${hours}${friendlySymbols ? '-' : ':'}${minutes}${friendlySymbols ? '-' : ':'}${seconds}${friendlySymbols ? '' : ']'}`;
  }

  private generateMessagePrefix(level: ELoggerLevel): { colored: string; raw: string, txtColor: string } {
    const fgColor = [this.BaseColors[level], this.AlternateColors[level]];
    var time = chalk.hex(fgColor[Number(this.coloredBackground)])(this.getTime() + ' ');
    var prefix = chalk.hex(fgColor[Number(this.coloredBackground)])(this.getFormattedPrefix() + ' ');
    var levelText = chalk.hex(fgColor[Number(this.coloredBackground)])(ELoggerLevel[level].toUpperCase() + ':');

    if (this.coloredBackground) {
      time = chalk.bgHex(this.BaseColors[level])(time);
      prefix = chalk.bgHex(this.BaseColors[level])(prefix);
      levelText = chalk.bgHex(this.BaseColors[level])(levelText);
    }

    return {
      colored: `${time}${prefix}${levelText}`,
      raw: `${this.getTime()} [${this.prefix}] ${ELoggerLevel[level].toUpperCase()}:`,
      txtColor: fgColor[Number(this.coloredBackground)],
    };
  }

  log(text: string | number | Error, levelToLog?: ELoggerLevel, ...args: any): void {
    const level = levelToLog ?? this.defaultLevel;
    if (level === ELoggerLevel.FATAL) return this.fatal(text, ...args);
    const consoleLevels = {
      [ELoggerLevel.INFO]: console.log,
      [ELoggerLevel.WARN]: console.warn,
      [ELoggerLevel.ERROR]: console.error,
      [ELoggerLevel.DEBUG]: console.debug,
    };

    const { colored, raw, txtColor } = this.generateMessagePrefix(level);

    const msg = (this.coloredBackground && this.allLineColored)
      ? chalk.bgHex(this.BaseColors[level])(chalk.hex(this.AlternateColors[level])(' ' + text))
      : (this.allLineColored ? chalk.hex(this.BaseColors[level])(' ' + text) : ' ' + text)
    ;

    consoleLevels[level](colored + msg, ...args);

    // eslint-disable-next-line max-len
    const textSpan = this.allLineColored ? `<span style="color: ${txtColor}; ${this.coloredBackground ? 'background: ' + this.BaseColors[level] : ''}">${text}</span>` : `<span style="color: ${this.htmlTextColor}; background: ${this.htmlBackgroundColor};">${text}</span>`;
    // eslint-disable-next-line max-len
    const prefixSpan = `<span style="color: ${txtColor}; ${this.coloredBackground ? 'background: ' + this.BaseColors[level] + ';' : ''}${(this.allLineColored && this.coloredBackground) ? '--txtBackground: ' + this.BaseColors[level] + ';' : ''}"><span class='pre'>${raw}&nbsp;</span>${textSpan}</span>\n`;
    if (this.fileProperties.enableDebugLog) {
      this.debugLogStream?.write(this.fileProperties.generateHTMLLog ? prefixSpan : (raw + ' ' + text + '\n'));
    }
  }

  info(text: string | number | Error, ...args: any): void {
    this.log(text, ELoggerLevel.INFO, ...args);
  }

  warn(text: string | number | Error, ...args: any): void {
    this.log(text, ELoggerLevel.WARN, ...args);
  }

  error(text: string | number | Error, ...args: any): void {
    this.log(text, ELoggerLevel.ERROR, ...args);
  }

  fatal(text: string | number | Error, ...args: any): void {
    var message = text.toString();
    if (text instanceof Error) {
      // create stacktrace
      const stack = text.stack?.split('\n');
      if (stack) {
        message = stack[0];
      }
    }

    const time = this.getTime();
    const prefix = this.getFormattedPrefix();
    const levelMsg = text.toString().startsWith('Error') ? 'FATAL ' : 'FATAL ERROR: ';

    message = `${time} ${prefix} ${levelMsg} ${message.toString()}`;

    const msg = chalk.bgWhite(chalk.redBright(message));

    console.error(msg, ...args);

    if (!this.disableFatalCrash) {
      process.exit(5);
    }
  }

  debug(text: string | number | Error, ...args: any): void {
    if (!this.debugActive) return;
    this.log(text, ELoggerLevel.DEBUG, ...args);
  }
}
