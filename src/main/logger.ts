import { ELoggerLevel, EStyles, ILogMessage, IMessageChunk } from './interfaces/ILogMessage';
import { ILoggerOptions, IPrefix } from './interfaces';
import { Engine } from './outputEngines/engine';
import utils from 'util';
import { IDefault } from './interfaces/IDefault';
import Standard from './defaults/standard';

export class Logger {
  private defaultLevel: ELoggerLevel = ELoggerLevel.INFO;
  private prefixes: IPrefix[];
  private disableFatalCrash: boolean;
  private logListeners: Engine[] = [];
  private redactedContent: string[];
  private coloredBackground: boolean;
  private allLineColored: boolean;
  private defaultSettings: IDefault;

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

  /**
   * Parses the message and returns an array of IMessageChunk objects
   * the first IMessageChunk object is the main message, the rest are subLines
   * @param text - The content to be parsed
   * @param args - The arguments to be passed to the content
   * @returns IMessageChunk[]
   */
  private processMessage(text: string | string[] | Error, forceSubline: boolean, ...args: any[]): IMessageChunk[] {
    if (!text) {
      return [{
        content: 'undefined',
        styling: [EStyles.textColor],
        stylingParams: [this.defaultSettings.undefinedColor],
        subLine: forceSubline,
      }];
    }

    // String handling
    if (typeof text !== 'object') {
      return [...text.toString().split('\n').map((line) => {
        return {
          content: this.redactText(utils.format(line, ...args)),
          styling: [],
          stylingParams: [],
          subLine: forceSubline,
        };
      })];

    // Error handling
    } else if (text instanceof Error) {
      const finalMessage = [];
      finalMessage.push({
        content: (forceSubline ? 'Error: ' : '') + this.redactText(utils.format(text.message, ...args)),
        styling: [],
        stylingParams: [],
        subLine: forceSubline,
      });

      const stack = text.stack?.split('\n');
      stack?.shift();

      stack?.forEach((line) => {
        finalMessage.push({
          content: this.redactText(line.trim()),
          styling: [],
          stylingParams: [],
          subLine: true,
        });
      });

      if (text.cause) {
        const causedBy = {
          content: '# Caused by:',
          styling: [EStyles.specialSubLine],
          stylingParams: [''],
          subLine: true,
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

        if (typeof text.cause === 'string' || Array.isArray(text.cause) || text.cause instanceof Error) {
          finalMessage.push(...this.processMessage(text.cause, true, ...args));
        } else {
          finalMessage.push({
            content: this.redactText(JSON.stringify(text.cause)),
            styling: [],
            stylingParams: [],
            subLine: true,
          });
        }
      }
      return finalMessage;
    } else if (!Array.isArray(text) || (Array.isArray(text) && (!args || args.length === 0))) {
      return [{
        content: this.redactText(utils.format(text, ...args)),
        styling: [EStyles.specialSubLine, EStyles.reset],
        stylingParams: ['', ''],
        subLine: true,
      }];
    }

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

  private handleMessage(text: string | string[] | Error, level: ELoggerLevel, ...args: any[]): void {
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
          const bgColor = this.coloredBackground ? this.defaultSettings.logLevelMainColors[level] : this.defaultSettings.logLevelAccentColors[level];
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

  log(text: string | string[], ...args: any[]): void {
    this.handleMessage(text, this.defaultLevel, ...args);
  }

  info(text: string | string[], ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.INFO, ...args);
  }

  warn(text: string | string[], ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.WARN, ...args);
  }

  error(text: string | string[] | Error, ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.ERROR, ...args);
  }

  debug(text: string | string[], ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.DEBUG, ...args);
  }

  fatal(text: string | string[] | Error, ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.FATAL, ...args);
  }

  alert(text: string | string[], ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.ALERT, ...args);
  }

  severe(text: string | string[] | Error, ...args: any[]): void {
    this.handleMessage(text, ELoggerLevel.SEVERE, ...args);
  }

  /**
   * Allows the assignment of a listener callback that will be called every log made
   * @param listenerCallback void function with the actions to be executed every log. Receives ILogMessage object.
   */
  registerListener(listenerEngine: Engine): void {
    this.logListeners.push(listenerEngine);
  }

  unRegisterListener(listenerEngine: Engine): void {
    this.logListeners = this.logListeners.filter((listener) => listener !== listenerEngine);
  }

  setColoredBackground(coloredBackground: boolean): void {
    this.coloredBackground = coloredBackground;
  }

  setAllLineColored(allLineColored: boolean): void {
    this.allLineColored = allLineColored;
  }
}
