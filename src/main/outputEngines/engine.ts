import { ILogMessage, IEngineSettings } from '../interfaces';
import { Logger } from '../logger';

export abstract class Engine {
  debug: boolean;
  private loggers: Logger[] = [];

  constructor(settings?: IEngineSettings, ...loggers: Logger[]) {
    if (Array.isArray(settings)) {
      loggers = settings;
      settings = undefined;
    }

    this.debug = settings?.debug || false;
    this.loggers = loggers;

    this.loggers.forEach((logger) => {
      logger.registerListener(this);
    });
  }

  destroy(): void {
    this.loggers.forEach((logger) => {
      logger.unRegisterListener(this);
    });
  }

  getTime(time: Date, fullDate?: boolean): string {
    const day = `0${time.getDate()}`.slice(-2);
    const month = `0${time.getMonth()}`.slice(-2);
    const year = `0${time.getFullYear()}`.slice(-2);
    const seconds = `0${time.getSeconds()}`.slice(-2);
    const minutes = `0${time.getMinutes()}`.slice(-2);
    const hours = `0${time.getHours()}`.slice(-2);

    return `[${fullDate ? `${day}:${month}:${year}-` : ''}${hours}:${minutes}:${seconds}]`;
  }

  log(message: ILogMessage): void {
    throw new Error('Method not implemented.', { cause: message });
  }
}
