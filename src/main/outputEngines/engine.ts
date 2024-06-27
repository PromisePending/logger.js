import { ILogMessage, IEngineSettings } from '../interfaces';
import { Logger } from '../logger';

/**
 * Engine
 * @description Abstract class that all engines should extend
 * @abstract
 * @class Engine
 **/
export abstract class Engine {
  // debug mode
  debug: boolean;
  // list of loggers that this engine is listening to
  loggers: Logger[] = [];

  constructor(settings?: IEngineSettings, ...loggers: Logger[]) {
    if (Array.isArray(settings)) {
      loggers = settings;
      settings = undefined;
    }
    if (settings instanceof Logger) {
      loggers = [settings];
      settings = undefined;
    }

    this.debug = settings?.debug || false;
    this.loggers = loggers;

    this.loggers.forEach((logger) => {
      logger.registerListener(this);
    });
  }

  /**
   * Deconstructs the engine
   */
  destroy(): void {
    this.loggers.forEach((logger) => {
      logger.unRegisterListener(this);
    });
  }

  /**
   * Register this Engine to an logger
   * @param logger the logger instance to register this Engine
   */
  registerLogger(logger: Logger): void {
    logger.registerListener(this);
  }

  /**
   * Converts a Date object to a string that can be used on logs
   * @param time Date object with the time to be converted
   * @param fullDate Boolean to indicate if result string should include days, months and years
   * @returns {string} The formatted time
   * @example
   * getTime(new Date(), true); // [2024:07:01-12:00:00]
   * getTime(new Date(), false); // [12:00:00]
   */
  getTime(time: Date, fullDate?: boolean): string {
    const day = `0${time.getDate()}`.slice(-2);
    const month = `0${time.getMonth()}`.slice(-2);
    const year = `0${time.getFullYear()}`.slice(-2);
    const seconds = `0${time.getSeconds()}`.slice(-2);
    const minutes = `0${time.getMinutes()}`.slice(-2);
    const hours = `0${time.getHours()}`.slice(-2);

    return `[${fullDate ? `${year}:${month}:${day}-` : ''}${hours}:${minutes}:${seconds}]`;
  }

  /**
   * logs a message
   * @param message The message to be logged
   */
  log(message: ILogMessage): void {
    throw new Error('Method not implemented.', { cause: message });
  }
}
