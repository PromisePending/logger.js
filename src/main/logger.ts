import { ELoggerLevel, EStyles, ILogMessage, IMessageChunk } from './interfaces/ILogMessage';
import { ILoggerOptions, IPrefix } from './interfaces';
import { Engine } from './outputEngines/engine';
import utils from 'util';
import { IDefault } from './interfaces/IDefault';
import Standard from './defaults/standard';
import { AutoLogEnd } from './autoLogEnd';

/**
 * Main class that will process logs before automaticly sending then to registered Engines
 */
export class Logger {
  // constants
  private static splitCharsNonScape = [' ', ',', ':', '<', '>'];
  private static splitCharsScape = ['*', '(', ')', '[', ']'];
  private static splitChars = [...Logger.splitCharsNonScape, ...Logger.splitCharsScape];

  // private fields
  private defaultLevel: ELoggerLevel = ELoggerLevel.INFO;
  private prefixes: IPrefix[];
  private disableFatalCrash: boolean;
  private logListeners: Engine[] = [];
  private redactedContent: string[];
  private coloredBackground: boolean;
  private allLineColored: boolean;
  private defaultSettings: IDefault;
  private exited = false;

  /**
   * @constructor
   * @param param0 ILoggerOptions object:
   * - prefixes: array of strings or IPrefix objects (can be empty list)
   * - - IPrefix: object containing `content` field for the text of the prefix, a `color` field that can be a function that receives the text as input and returns a hex color string array for each letter, a array with hex codes for each letter, or a simple hex color string for the whole text, and a `backgroundColor` field that behaves like the color param
   * - defaultLevel?: optional value from ELoggerLevel enum, determines what kind of log the .log method will execute (default: info)
   * - disableFatalCrash?: optional value that when set true disables exiting the process when a fatal log happens (default: false)
   * - redactedContent?: optional list of regex strings that when any match will replace the text with the redacted message
   * - allLineColored?: optional boolean that sets if the content of the message should be colored the same as the log level color (default: false)
   * - coloredBackground?: optional boolean that sets if the log level color will be applied to the background instead of the text (default: false)
   * - defaultSettings?: optional IDefault object containing the colors and redacted text to be used, see /defaults/standard.ts file (default: /defaults/standard.ts file)
   * @example
   * const logger = new Logger({
   *     prefix: ['example'],
   *     allLineColored: true,
   * });
   * new ConsoleEngine(logger);
   * logger.info('Hi!');
   */
  constructor({ prefixes, defaultLevel, disableFatalCrash, redactedContent, allLineColored, coloredBackground, defaultSettings }: ILoggerOptions) {
    this.defaultLevel = defaultLevel ?? ELoggerLevel.INFO;
    this.disableFatalCrash = disableFatalCrash ?? false;
    this.redactedContent = redactedContent ?? [];

    this.allLineColored = allLineColored ?? false;
    this.coloredBackground = coloredBackground ?? false;
    this.defaultSettings = defaultSettings ?? Standard;

    this.prefixes = this.parseMessagePrefix(prefixes);
  }

  private parseMessagePrefix(prefixes: (IPrefix | string)[]): IPrefix[] {
    if (!prefixes || prefixes.length === 0) return [];
    return prefixes.map((prefix) => {
      if (typeof prefix !== 'string') return prefix;
      return {
        content: prefix,
        color: this.defaultSettings.prefixMainColor,
        backgroundColor: null,
      };
    });
  }

  private redactText(text: string): string {
    let modifiedString = text;
    this.redactedContent.forEach((redaction) => {
      const reg = new RegExp(redaction, 'gi');
      const matches = modifiedString.matchAll(reg);
      let accumulator = 0;
      for (const match of matches) {
        if (typeof match.index !== 'number') continue;
        modifiedString =
          `${modifiedString.slice(0, match.index + accumulator)}${this.defaultSettings.redactionText}${modifiedString.slice(match.index + match[0].length + accumulator)}`;
        accumulator += this.defaultSettings.redactionText.length - match[0].length;
      }
    });
    return modifiedString;
  }

  private colorPrimitiveValue(text: string): { text: string, colorStyles: EStyles[], colorStylesValues: string[] } {
    let color = null;
    if (text === 'null') color = this.defaultSettings.primitiveColors.null;
    else if (text === 'undefined') color = this.defaultSettings.primitiveColors.undefined;
    else if (text === 'true' || text === 'false') color = this.defaultSettings.primitiveColors.boolean;
    else if (
      (text.startsWith('"') && text.endsWith('"')) || (text.startsWith('\'') && text.endsWith('\'')) || (text.startsWith('`') && text.endsWith('`'))
    ) color = this.defaultSettings.primitiveColors.string;
    else if (!isNaN(Number(text))) color = this.defaultSettings.primitiveColors.number;
    else if (text.includes('Circular') || text.includes('ref')) color = this.defaultSettings.primitiveColors.circular;
    else if (text.toLowerCase().includes('info')) color = this.defaultSettings.logLevelMainColors[ELoggerLevel.INFO];
    else if (text.toLowerCase().includes('warn')) color = this.defaultSettings.logLevelMainColors[ELoggerLevel.WARN];
    else if (text.toLowerCase().includes('error')) color = this.defaultSettings.logLevelMainColors[ELoggerLevel.ERROR];
    else if (text.toLowerCase().includes('debug')) color = this.defaultSettings.logLevelMainColors[ELoggerLevel.DEBUG];
    return {
      text,
      colorStyles: color ? [EStyles.textColor] : [],
      colorStylesValues: color ? [color] : [],
    };
  }

  private colorPrimitive(text: string): { text: string, colorStyles: EStyles[], colorStylesValues: string[] }[] {
    const result: { text: string, colorStyles: EStyles[], colorStylesValues: string[] }[] = [];
    let elementGroupBuffer = '';
    text.split(RegExp(`(\\${Logger.splitCharsScape.join('|\\')}|${Logger.splitCharsNonScape.join('|')})`, 'gu')).forEach((element) => {
      if (Logger.splitChars.includes(element)) elementGroupBuffer += element;
      else {
        if (elementGroupBuffer !== '') {
          result.push({ text: elementGroupBuffer, colorStyles: [], colorStylesValues: [] });
          elementGroupBuffer = '';
        }
        const { text: coloredText, colorStyles, colorStylesValues } = this.colorPrimitiveValue(element);
        result.push({ text: coloredText, colorStyles, colorStylesValues });
      }
    });
    return result;
  }

  private processStrings(text: any, forceSubline: boolean, ...args: any[]): IMessageChunk[] {
    const texts: string[] = [];
    const otherKinds: any[] = [];
    args.map((arg) => typeof arg === 'string' ? texts.push(arg) : otherKinds.push(arg));
    const processedOtherKinds: IMessageChunk[] = [];
    otherKinds.map((otherElement) => this.processMessage(otherElement, true)).forEach((otherPElement) => {
      otherPElement.map((chunk) => processedOtherKinds.push(chunk));
    });
    const processedTexts: IMessageChunk[] = [];
    (text.toString() as string).split('\n').forEach((line: string, index: number, arr: string[]) => {
      const processedColors = this.colorPrimitive(utils.format(
        this.redactText(line), ...((index === arr.length - 1) ? texts : [(line.includes('%s') ? texts.shift() : '')]),
      ));
      processedColors.forEach((color, colorIndex) => {
        processedTexts.push({
          content: color.text,
          styling: color.colorStyles,
          stylingParams: color.colorStylesValues,
          subLine: index === 0 ? forceSubline : true,
          breaksLine: (index === 0 ? forceSubline : true) && colorIndex === 0,
        });
      });
    });
    return [...processedTexts, ...processedOtherKinds];
  }

  private processErrors(text: Error, forceSubline: boolean, ...args: any[]): IMessageChunk[] {
    const finalMessage: IMessageChunk[] = [];
    const processedColors = this.colorPrimitive(utils.format((forceSubline ? 'Error: ' : '') + this.redactText(text.message).trim(), ...args));
    processedColors.forEach((color, colorIndex) => {
      finalMessage.push({
        content: color.text,
        styling: color.colorStyles,
        stylingParams: color.colorStylesValues,
        subLine: forceSubline,
        breaksLine: colorIndex === 0 && forceSubline,
      });
    });

    const stack = text.stack?.split('\n');
    stack?.shift();

    stack?.forEach((line) => {
      const processedColors = this.colorPrimitive(utils.format(this.redactText(line).trim()));
      processedColors.forEach((color, colorIndex) => {
        finalMessage.push({
          content: color.text,
          styling: color.colorStyles,
          stylingParams: color.colorStylesValues,
          subLine: true,
          breaksLine: colorIndex === 0,
        });
      });
    });

    if (text.cause) {
      const causedBy: IMessageChunk = {
        content: '# Caused by:',
        styling: [EStyles.specialSubLine],
        stylingParams: [''],
        subLine: true,
        breaksLine: true,
      };

      if (this.defaultSettings.causedByBackgroundColor) {
        causedBy.styling.push(EStyles.backgroundColor);
        causedBy.stylingParams.push(this.defaultSettings.causedByBackgroundColor);
      }
      if (this.defaultSettings.causedByTextColor) {
        causedBy.styling.push(EStyles.textColor);
        causedBy.stylingParams.push(this.defaultSettings.causedByTextColor);
      }

      finalMessage.push(causedBy);
      finalMessage.push(...this.processMessage(text.cause, true, ...args));
    }
    return finalMessage;
  }

  private processObjects(text: any, forceSubline: boolean, ...args: any[]): IMessageChunk[] {
    const processedArgs: IMessageChunk[] = [];
    if (args.length > 0) {
      args.map((arg) => this.processMessage(arg, true)).forEach((processedArg) => {
        processedArg.map((chunk) => processedArgs.push(chunk));
      });
    }
    return [...this.processMessage(utils.format(text), forceSubline), ...processedArgs];
  }

  private processStringLiterals(text: string[], forceSubline: boolean, ...args: any[]): IMessageChunk[] {
    const finalMessage: (IMessageChunk & {subLine: boolean})[] = [];

    let switchedToSublines = forceSubline;
    text.forEach((line, index) => {
      const variable = args[index];
      if (line) {
        finalMessage.push({
          content: this.redactText(line.toString()),
          styling: [EStyles.specialSubLine],
          stylingParams: [''],
          subLine: switchedToSublines,
          breaksLine: false,
        });
      }
      if (variable) {
        const chunks = this.processMessage(variable, switchedToSublines);
        chunks[0].styling.push(...this.defaultSettings.variableStyling);
        chunks[0].stylingParams.push(...this.defaultSettings.variableStylingParams);
        if (!forceSubline && chunks.find((sublineFinder) => sublineFinder.subLine)) switchedToSublines = true;
        finalMessage.push(...chunks);
      }
    });

    return finalMessage;
  }

  /**
   * Parses the message and returns an array of IMessageChunk objects
   * the first IMessageChunk object is the main message, the rest are subLines
   * @param text - The content to be parsed
   * @param args - The arguments to be passed to the content
   * @returns IMessageChunk[]
   */
  private processMessage(text: any, forceSubline: boolean, ...args: any[]): IMessageChunk[] {
    if (!text) text = 'undefined';

    if (typeof text !== 'object') return this.processStrings(text, forceSubline, ...args);
    else if (text instanceof Error) return this.processErrors(text, forceSubline, ...args);
    else if (!Array.isArray(text) || (Array.isArray(text) && (!args || args.length === 0))) return this.processObjects(text, forceSubline, ...args);
    return this.processStringLiterals(text, forceSubline, ...args);
  }

  private handleMessage(text: any, level: ELoggerLevel, ...args: any[]): void {
    if (this.exited) return;
    const chunks = this.processMessage(text, false, ...args);
    const messageChunks: IMessageChunk[] = [];
    const subLines: IMessageChunk[] = [];

    chunks.forEach((chunk) => {
      if (chunk.subLine) subLines.push(chunk);
      else {
        if (level === ELoggerLevel.FATAL) {
          chunk.styling.unshift(EStyles.textColor, EStyles.backgroundColor);
          chunk.stylingParams.unshift(this.defaultSettings.logLevelAccentColors[level], this.defaultSettings.logLevelMainColors[level]);
        }
        if (this.allLineColored) {
          const txtColor = this.coloredBackground ? this.defaultSettings.logLevelAccentColors[level] : this.defaultSettings.logLevelMainColors[level];
          const bgColor = this.coloredBackground ? this.defaultSettings.logLevelMainColors[level] : undefined;
          if (txtColor) {
            chunk.styling.unshift(EStyles.textColor);
            chunk.stylingParams.unshift(txtColor);
          }
          if (bgColor) {
            chunk.styling.unshift(EStyles.backgroundColor);
            chunk.stylingParams.unshift(bgColor);
          }
        }
        messageChunks.push(chunk);
      }
    });

    // prevents errors where a message would have no content, only sublines
    if (messageChunks.length === 0) messageChunks.push({ content: '', styling: [], stylingParams: [], subLine: false, breaksLine: false });

    const message: ILogMessage = {
      messageChunks,
      subLines,
      prefixes: this.prefixes,
      timestamp: new Date(),
      logLevel: level,
      settings: {
        coloredBackground: this.coloredBackground,
        default: this.defaultSettings,
      },
    };

    this.logListeners.forEach((logListener) => {
      logListener.log(message);
    });
  }

  /**
   * Logs a message using the default level
   * @param text A string, list of strings or Error object to be logged
   * @param args A list of arguments to be passed to the text
   * @example
   * logger.log('Hello, world!'); // Logs 'Hello, world!' with the default level
   * logger.log`Hello, ${name}!`; // Logs 'Hello, <name>!' where name will be styled as a variable
   * logger.log`Hello, ${errorObject}`; // logs 'Hello, <error message>' followed with the stacktrace
   * logger.log(errorObject); // logs '<error message>' followed with the stacktrace
   */
  log(text: any, ...args: any[]): void {
    this.handleMessage(text, this.defaultLevel, ...args);
  }

  /**
   * Logs a message using the info level
   * @param text A string, list of strings or Error object to be logged
   * @param args A list of arguments to be passed to the text
   * @example
   * logger.info('Hello, world!'); // Logs 'Hello, world!' with the info level
   * logger.info`Hello, ${name}!`; // Logs 'Hello, <name>!' where name will be styled as a variable
   * logger.info`Hello, ${errorObject}`; // logs 'Hello, <error message>' followed with the stacktrace
   * logger.info(errorObject); // logs '<error message>' followed with the stacktrace
   */
  info(text: any, ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.INFO, ...args);
  }

  /**
   * Logs a message using the warn level
   * @param text A string, list of strings or Error object to be logged
   * @param args A list of arguments to be passed to the text
   * @example
   * logger.warn('Hello, world!'); // Logs 'Hello, world!' with the warn level
   * logger.warn`Hello, ${name}!`; // Logs 'Hello, <name>!' where name will be styled as a variable
   * logger.warn`Hello, ${errorObject}`; // logs 'Hello, <error message>' followed with the stacktrace
   * logger.warn(errorObject); // logs '<error message>' followed with the stacktrace
   */
  warn(text: any, ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.WARN, ...args);
  }

  /**
   * Logs a message using the error level
   * @param text A string, list of strings or Error object to be logged
   * @param args A list of arguments to be passed to the text
   * @example
   * logger.error('Hello, world!'); // Logs 'Hello, world!' with the error level
   * logger.error`Hello, ${name}!`; // Logs 'Hello, <name>!' where name will be styled as a variable
   * logger.error`Hello, ${errorObject}`; // logs 'Hello, <error message>' followed with the stacktrace
   * logger.error(errorObject); // logs '<error message>' followed with the stacktrace
   */
  error(text: any, ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.ERROR, ...args);
  }

  /**
   * Logs a message using the debug level, this level is only logged if the debug mode is enabled
   * @param text A string or list of strings to be logged
   * @param args A list of arguments to be passed to the text
   * @example
   * logger.debug('Hello, world!'); // Logs 'Hello, world!' with the debug level
   * logger.debug`Hello, ${name}!`; // Logs 'Hello, <name>!' where name will be styled as a variable
   * logger.debug`Hello, ${errorObject}`; // logs 'Hello, <error message>' followed with the stacktrace
   * logger.debug(errorObject); // logs '<error message>' followed with the stacktrace
   */
  debug(text: any, ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.DEBUG, ...args);
  }

  /**
   * Logs a message using the fatal level, will stop the execution of the program unless disableFatalCrash is set to true
   * @param text A string or list of strings to be logged
   * @param args A list of arguments to be passed to the text
   * @example
   * logger.fatal('Hello, world!'); // Logs 'Hello, world!' with the fatal level
   * logger.fatal`Hello, ${name}!`; // Logs 'Hello, <name>!' where name will be styled as a variable
   * logger.fatal`Hello, ${errorObject}`; // logs 'Hello, <error message>' followed with the stacktrace
   * logger.fatal(errorObject); // logs '<error message>' followed with the stacktrace
   */
  fatal(text: any, ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.FATAL, ...args);
    if (!this.disableFatalCrash && !this.exited) {
      this.exited = true;
      AutoLogEnd._instance?.callDeconstructors().then(() => { process.exit(647412); });
    }
  }

  /**
   * Logs a message using the Warning level
   * @param text A string or list of strings to be logged
   * @param args A list of arguments to be passed to the text
   * @example
   * logger.alert('Hello, world!'); // Logs 'Hello, world!' with the warning level
   * logger.alert`Hello, ${name}!`; // Logs 'Hello, <name>!' where name will be styled as a variable
   * logger.alert`Hello, ${errorObject}`; // logs 'Hello, <error message>' followed with the stacktrace
   * logger.alert(errorObject); // logs '<error message>' followed with the stacktrace
   */
  alert(text: string | string[], ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.ALERT, ...args);
  }

  /**
   * Logs a message using the Error level
   * @param text A string or list of strings to be logged
   * @param args A list of arguments to be passed to the text
   * @example
   * logger.severe('Hello, world!'); // Logs 'Hello, world!' with the Error level
   * logger.severe`Hello, ${name}!`; // Logs 'Hello, <name>!' where name will be styled as a variable
   * logger.severe`Hello, ${errorObject}`; // logs 'Hello, <error message>' followed with the stacktrace
   * logger.severe(errorObject); // logs '<error message>' followed with the stacktrace
   */
  severe(text: any, ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.SEVERE, ...args);
  }

  /**
   * Registers an engine listener to this logger
   * @param listenerEngine The engine to be registered
   */
  registerListener(listenerEngine: Engine): void {
    this.logListeners.push(listenerEngine);
  }

  /**
   * Unregisters an engine listener from this logger
   * @param listenerEngine The engine to be unregistered
   */
  unRegisterListener(listenerEngine: Engine): void {
    this.logListeners = this.logListeners.filter((listener) => listener !== listenerEngine);
  }

  /**
   * Sets the colored background state for this logger
   * @param coloredBackground The new state for colored background
   * @example
   * logger.setColoredBackground(true); // All logs will have colored background from now on
   * logger.setColoredBackground(false); // All logs will not have a background from now on
   */
  setColoredBackground(coloredBackground: boolean): void {
    this.coloredBackground = coloredBackground;
  }

  /**
   * Sets the all line colored state for this logger
   * @param allLineColored The new state for all line colored
   * @example
   * logger.setAllLineColored(true); // The content of the logs will be colored from now on
   * logger.setAllLineColored(false); // Only the information of the logs will be colored while the actual content will stay unchanged from now on
   */
  setAllLineColored(allLineColored: boolean): void {
    this.allLineColored = allLineColored;
  }
}
