import { ELoggerLevel, ELoggerLevelNames, EStyles, IFileStorageSettings, ILogMessage, IMessageChunk } from '../interfaces';
import { Logger } from '../logger';
import { Engine } from './';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { AutoLogEnd } from '../autoLogEnd';

/**
 * FileStorageEngine
 * @description Engine that allows logs to be saved to files on the disk
 * @extends Engine
 */
export class FileStorageEngine extends Engine {
  private uuid: string;
  private engineSettings: IFileStorageSettings;
  private latestLogStream: fs.WriteStream | null = null;
  private debugLogStream: fs.WriteStream | null = null;
  private errorLogStream: fs.WriteStream | null = null;
  private fatalLogStream: fs.WriteStream | null = null;
  private debugLogFolderPath: string;
  private errorLogFolderPath: string;
  private fatalLogFolderPath: string;
  private logQueue: {txt: string, level: ELoggerLevel}[] = [];
  private logQueueRunning = false;

  constructor(settings: IFileStorageSettings, ...loggers: Logger[]) {
    super(settings, ...loggers);
    if (!settings) throw new Error('settings is required');
    this.engineSettings = settings;
    this.engineSettings.logFolderPath = path.resolve(this.engineSettings.logFolderPath); // resolve path to absolute path
    this.debugLogFolderPath = path.resolve(this.engineSettings.logFolderPath, 'debug');
    this.errorLogFolderPath = path.resolve(this.engineSettings.logFolderPath, 'error');
    this.fatalLogFolderPath = path.resolve(this.engineSettings.logFolderPath, 'fatal');

    // generate a uuid for this instance
    this.uuid = 'FSEngine-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    AutoLogEnd._instance?.appendDeconstructor(this.uuid, async () => { await this.destroy(); });

    // check if logFolderPath exists
    if (!this.engineSettings.logFolderPath) throw new Error('logFolderPath is required');
    if (fs.existsSync(this.engineSettings.logFolderPath)) {
      if (!fs.lstatSync(this.engineSettings.logFolderPath).isDirectory()) throw new Error('logFolderPath is not a directory');
      // create subfolder if it doesnt exist
      if (!fs.existsSync(this.debugLogFolderPath)) fs.mkdirSync(this.debugLogFolderPath, { recursive: true });
      if (!fs.existsSync(this.errorLogFolderPath)) fs.mkdirSync(this.errorLogFolderPath, { recursive: true });
      if (!fs.existsSync(this.fatalLogFolderPath)) fs.mkdirSync(this.fatalLogFolderPath, { recursive: true });

      // check if theres a latest.log file and rename it to a timestamp
      const date = new Date();
      const timestamp = date.toISOString().replace(/:/g, '-').replace(/\./g, '-').replace('T', '-').replace('Z', '');
      if (fs.existsSync(path.resolve(this.engineSettings.logFolderPath, 'latest.log'))) {
        fs.renameSync(path.resolve(this.engineSettings.logFolderPath, 'latest.log'), path.resolve(this.engineSettings.logFolderPath, `${timestamp}.log`));
      }
      if (fs.existsSync(path.resolve(this.debugLogFolderPath, 'latest.log'))) {
        fs.renameSync(path.resolve(this.debugLogFolderPath, 'latest.log'), path.resolve(this.debugLogFolderPath, `${timestamp}.log`));
      }
      if (fs.existsSync(path.resolve(this.errorLogFolderPath, 'latest.log'))) {
        fs.renameSync(path.resolve(this.errorLogFolderPath, 'latest.log'), path.resolve(this.errorLogFolderPath, `${timestamp}.log`));
      }
      if (fs.existsSync(path.resolve(this.fatalLogFolderPath, 'latest.log'))) {
        fs.renameSync(path.resolve(this.fatalLogFolderPath, 'latest.log'), path.resolve(this.fatalLogFolderPath, `${timestamp}.log`));
      }

      if (this.engineSettings.compressLogFilesAfterNewExecution) {
        // compress log files
        const zipperInstance = new AdmZip();
        const files = fs.readdirSync(this.engineSettings.logFolderPath);
        // get the only .log file
        const logFile = files.filter((file) => file.endsWith('.log'))[0];
        if (logFile) {
          const logTimestamp = logFile.split('.')[0];
          // add all files and folders to the zip
          zipperInstance.addLocalFolder(this.engineSettings.logFolderPath, '', (filename) => !filename.endsWith('.zip'));
          // save the zip file
          zipperInstance.writeZip(`${this.engineSettings.logFolderPath}/${logTimestamp}.zip`);
          // remove all .log files recursively
          const removeLogFiles = (folderPath: string): void => {
            const files = fs.readdirSync(folderPath);
            files.forEach((file) => {
              const filePath = path.resolve(folderPath, file);
              if (fs.lstatSync(filePath).isDirectory()) {
                removeLogFiles(filePath);
              } else if (file.endsWith('.log')) {
                fs.unlinkSync(filePath);
              }
            });
          };
          removeLogFiles(this.engineSettings.logFolderPath);
        }
      }
    } else {
      fs.mkdirSync(this.engineSettings.logFolderPath, { recursive: true });
      fs.mkdirSync(this.debugLogFolderPath, { recursive: true });
      fs.mkdirSync(this.errorLogFolderPath, { recursive: true });
      fs.mkdirSync(this.fatalLogFolderPath, { recursive: true });
    }

    this.latestLogStream = fs.createWriteStream(path.resolve(this.engineSettings.logFolderPath, 'latest.log'), { flags: 'a' });
    if (this.engineSettings.enableDebugLog) this.debugLogStream = fs.createWriteStream(path.resolve(this.debugLogFolderPath, 'latest.log'), { flags: 'a' });
    if (this.engineSettings.enableErrorLog) this.errorLogStream = fs.createWriteStream(path.resolve(this.errorLogFolderPath, 'latest.log'), { flags: 'a' });
    if (this.engineSettings.enableFatalLog) this.fatalLogStream = fs.createWriteStream(path.resolve(this.fatalLogFolderPath, 'latest.log'), { flags: 'a' });
  }

  /**
   * Deconstructs the FileStorageEngine
   * @returns void
   */
  async destroy(): Promise<void> {
    this.loggers.forEach((logger) => {
      logger.unRegisterListener(this);
    });
    await this.closeStreams();
  }

  private parseTextStyles(chunk: IMessageChunk, subLine?: boolean): string {
    return `${subLine && (!chunk.styling.includes(EStyles.specialSubLine) && chunk.breaksLine) ? '|  ' : ''}${chunk.content}`;
  }

  /**
   * Closes all files streams
   * NOTE: Only call this method when you are done with the logger, and you're not using autoLogEnd!
   * @returns void
   */
  async closeStreams(): Promise<void> {
    return new Promise((_resolve) => {
      const promises: Promise<void>[] = [];
      const date = new Date();
      const timestamp = date.toISOString().replace(/:/g, '-').replace(/\./g, '-').replace('T', '-').replace('Z', '');
      promises.push(new Promise((resolve) => {
        if (this.latestLogStream) {
          this.latestLogStream.close(() => {
            if (fs.existsSync(path.resolve(this.engineSettings.logFolderPath, 'latest.log'))) {
              fs.renameSync(path.resolve(this.engineSettings.logFolderPath, 'latest.log'), path.resolve(this.engineSettings.logFolderPath, `${timestamp}.log`));
            }
            resolve();
          });
        }
      }));
      promises.push(new Promise((resolve) => {
        if (this.debugLogStream) {
          this.debugLogStream.close(() => {
            if (fs.existsSync(path.resolve(this.debugLogFolderPath, 'latest.log'))) {
              fs.renameSync(path.resolve(this.debugLogFolderPath, 'latest.log'), path.resolve(this.debugLogFolderPath, `${timestamp}.log`));
            }
            resolve();
          });
        }
      }));
      promises.push(new Promise((resolve) => {
        if (this.errorLogStream) {
          this.errorLogStream.close(() => {
            if (fs.existsSync(path.resolve(this.errorLogFolderPath, 'latest.log'))) {
              fs.renameSync(path.resolve(this.errorLogFolderPath, 'latest.log'), path.resolve(this.errorLogFolderPath, `${timestamp}.log`));
            }
            resolve();
          });
        }
      }));
      promises.push(new Promise((resolve) => {
        if (this.fatalLogStream) {
          this.fatalLogStream.close(() => {
            if (fs.existsSync(path.resolve(this.fatalLogFolderPath, 'latest.log'))) {
              fs.renameSync(path.resolve(this.fatalLogFolderPath, 'latest.log'), path.resolve(this.fatalLogFolderPath, `${timestamp}.log`));
            }
            resolve();
          });
        }
      }));
      Promise.all(promises).then(() => {
        _resolve();
      });
    });
  }

  private async logTextToFile(txt: string, logLevel: ELoggerLevel): Promise<void> {
    const promises: Promise<void>[] = [];
    promises.push((new Promise<void>((resolve) => {
      if (this.latestLogStream) this.latestLogStream.write(txt, () => { resolve(); });
      else resolve();
    })));
    switch (logLevel) {
      case ELoggerLevel.DEBUG:
        promises.push((new Promise<void>((resolve) => {
          if (this.debugLogStream) this.debugLogStream.write(txt, () => { resolve(); });
          else resolve();
        })));
        break;
      case ELoggerLevel.ERROR:
        promises.push((new Promise<void>((resolve) => {
          if (this.errorLogStream) this.errorLogStream.write(txt, () => { resolve(); });
          else resolve();
        })));
        break;
      case ELoggerLevel.FATAL:
        promises.push((new Promise<void>((resolve) => {
          if (this.fatalLogStream) this.fatalLogStream.write(txt, () => { resolve(); });
          else resolve();
        })));
        break;
      default:
        break;
    }
    await Promise.all(promises);
  }

  private async runLogQueue(): Promise<void> {
    if (this.logQueueRunning) return;
    if (this.logQueue.length <= 0) {
      this.logQueueRunning = false;
      return;
    }
    this.logQueueRunning = true;
    const log = this.logQueue.shift();
    if (!log) {
      this.logQueueRunning = false;
      return;
    }
    await this.logTextToFile(log.txt, log.level);
    this.logQueueRunning = false;
    this.runLogQueue();
  }

  private logToFile(txt: string, logLevel: ELoggerLevel): void {
    this.logQueue.push({ txt, level: logLevel });
    if (!this.logQueueRunning) this.runLogQueue();
  }

  /**
   * Logs a message to the file
   * @param message The message to be logged
   * @returns void
   */
  log(message: ILogMessage): void {
    if (!this.debug && message.logLevel === ELoggerLevel.DEBUG) return;
    const timestamp = this.getTime(message.timestamp, true);

    const prefixes = message.prefixes.map((prefix) => `[${prefix.content}]`).join(' ');
    const level = ELoggerLevelNames[message.logLevel];

    const textContent = message.messageChunks.map((chunk): string => this.parseTextStyles(chunk, false)).join('');

    this.logToFile(`${timestamp} ${prefixes} ${level}: ${textContent}\n`, message.logLevel);

    if (!message.subLines || message.subLines.length <= 0) return;

    let biggestLine = 0;
    let lineBuffer = '';
    const lines: string[] = [];
    message.subLines.forEach((line, index, arr) => {
      lineBuffer += this.parseTextStyles(line, true);
      if (arr[index + 1]?.breaksLine || index === arr.length - 1) {
        if (lineBuffer.length > biggestLine) biggestLine = lineBuffer.length;
        lines.push(lineBuffer);
        lineBuffer = '';
      }
    });
    this.logToFile(lines.join('\n') + '\n', message.logLevel);

    this.logToFile(this.parseTextStyles({
      content: '#'.padEnd(biggestLine, '-'),
      styling: [EStyles.specialSubLine],
      stylingParams: [''],
      subLine: true,
      breaksLine: false,
    }, true) + '\n',
    message.logLevel);
  }
}
