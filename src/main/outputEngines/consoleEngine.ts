import { ELoggerLevel, ELoggerLevelNames, EStyles, ILogMessage, IMessageChunk, IPrefix } from '../interfaces';
import { Engine } from './';
import chalk from 'chalk';

export class ConsoleEngine extends Engine {
  private prefixes = new Map<string, string>();

  private consoleLoggers = {
    [ELoggerLevel.INFO]: console.info,
    [ELoggerLevel.WARN]: console.warn,
    [ELoggerLevel.ERROR]: console.error,
    [ELoggerLevel.FATAL]: console.error,
    [ELoggerLevel.DEBUG]: console.debug,
  };

  private parseTextStyles(chunk: IMessageChunk, subLine?: boolean, backgroundColor?: string, customFGColor?: string): string {
    let finalMsg = subLine ? (backgroundColor ? chalk.bgHex(backgroundColor).gray : chalk.gray) : chalk.reset;
    let special = false;
    chunk.styling.forEach((style, index) => {
      switch (style) {
        case EStyles.bold:
          finalMsg = finalMsg.bold;
          break;
        case EStyles.italic:
          finalMsg = finalMsg.italic;
          break;
        case EStyles.backgroundColor:
          finalMsg = finalMsg.bgHex(chunk.stylingParams[index]);
          break;
        case EStyles.textColor:
          finalMsg = finalMsg.hex(chunk.stylingParams[index]);
          break;
        case EStyles.specialSubLine:
          special = true;
          break;
        case EStyles.reset:
          finalMsg = finalMsg.reset;
          break;
        default:
          break;
      }
    });
    let finalMessage = '';
    const fullLineTxt = chunk.content.padEnd(process.stdout.columns - (subLine && !special ? 3 : 0));
    if (subLine && !special) {
      finalMessage += (customFGColor ? (backgroundColor ? chalk.bgHex(backgroundColor) : chalk).hex(customFGColor)('|  ') : finalMsg('|  '));
      finalMessage += (customFGColor ? finalMsg.hex(customFGColor)(fullLineTxt) : finalMsg(fullLineTxt));
    } else if (subLine && special) {
      finalMessage += finalMsg(fullLineTxt);
    } else {
      finalMessage += (customFGColor ? chalk.hex(customFGColor)(finalMsg(chunk.content)) : finalMsg(chunk.content));
    }
    return finalMessage;
  }

  private parsePrefix(prefixes: IPrefix[], defaultBg?: string): (string | undefined)[] {
    return prefixes.map((prefix) => {
      if (this.prefixes.has(prefix.content)) return this.prefixes.get(prefix.content);

      let bgColor = '';
      let bgColorArray: string[] = [];
      if (prefix.backgroundColor && !Array.isArray(prefix.backgroundColor)) {
        if (typeof prefix.backgroundColor === 'function') {
          const result = prefix.backgroundColor(prefix.content);
          if (!Array.isArray(result)) bgColor = result;
          else bgColorArray = result;
        } else {
          bgColor = prefix.backgroundColor;
        }
      } else if (prefix.backgroundColor && Array.isArray(prefix.backgroundColor)) {
        bgColorArray = prefix.backgroundColor;
      }

      let fgColor = '';
      let fgArray: string[] = [];
      if (!Array.isArray(prefix.color)) {
        if (typeof prefix.color === 'function') {
          const result = prefix.color(prefix.content);
          if (!Array.isArray(result)) fgColor = result;
          else fgArray = result;
        } else {
          fgColor = prefix.color;
        }
      } else {
        fgArray = prefix.color;
      }

      // static colors
      if (bgColor && fgColor) {
        const result = chalk.bgHex(bgColor).hex(fgColor)(prefix.content);
        this.prefixes.set(prefix.content, result);
        return result;
      }
      if (!bgColor && bgColorArray.length <= 0 && fgColor) {
        const result = (defaultBg ? chalk.bgHex(defaultBg) : chalk).hex(fgColor)(prefix.content);
        this.prefixes.set(prefix.content, result);
        return result;
      }

      // Gradients
      let finalMsg = '';

      // repeat the last color so that fgArray size matches prefix.content size
      if (fgArray.length > 0 && fgArray.length < prefix.content.length) fgArray.push(...Array(prefix.content.length - fgArray.length).fill(fgArray[0]));

      // Has background color gradient
      if (bgColorArray.length > 0) {
        // repeat the last color so that bgColorArray size matches prefix.content size
        if (bgColorArray.length < prefix.content.length) bgColorArray.push(...Array(prefix.content.length - bgColorArray.length).fill(bgColorArray[0]));
        bgColorArray.forEach((color, index) => {
          if (fgArray.length > 0) finalMsg += chalk.bgHex(color).hex(fgArray[index])(prefix.content[index]);
          else finalMsg += chalk.bgHex(color).hex(fgColor)(prefix.content[index]);
        });

      // Doesn't have background color or it is a static color
      } else {
        fgArray.forEach((color, index) => {
          if (bgColor) finalMsg += chalk.bgHex(bgColor).hex(color)(prefix.content[index]);
          else finalMsg += (defaultBg ? chalk.bgHex(defaultBg) : chalk).hex(color)(prefix.content[index]);
        });
      }
      this.prefixes.set(prefix.content, finalMsg);
      return finalMsg;
    });
  }

  log(message: ILogMessage): void {
    if (!this.debug && message.logLevel === ELoggerLevel.DEBUG) return;

    const defaultSettings = message.settings.default;
    const shouldColorBg = message.settings.coloredBackground || message.logLevel === ELoggerLevel.FATAL;

    if (shouldColorBg) this.prefixes.clear();

    let formatter: chalk.Chalk = chalk.reset;
    if (shouldColorBg) formatter = formatter.bgHex(defaultSettings.logLevelMainColors[message.logLevel]);

    if (shouldColorBg && defaultSettings.logLevelAccentColors[message.logLevel]) formatter = formatter.hex(defaultSettings.logLevelAccentColors[message.logLevel]);

    if (!message.settings.coloredBackground && message.logLevel !== ELoggerLevel.FATAL) formatter = formatter.hex(defaultSettings.logLevelMainColors[message.logLevel]);
    const timestamp = formatter(this.getTime(message.timestamp));

    const prefixes = this.parsePrefix(message.prefixes, shouldColorBg ? defaultSettings.logLevelMainColors[message.logLevel] : undefined);

    if (message.logLevel === ELoggerLevel.FATAL) this.prefixes.clear();

    let prefixTxt = '';
    prefixes.forEach((prefix) => {
      prefixTxt += formatter(' [');
      prefixTxt += prefix;
      prefixTxt += formatter(']');
    });
    const level = formatter(` ${ELoggerLevelNames[message.logLevel]}:`);

    // adds a space before the first chunk to separate the message from the : in the log without coloring the background if allLineColored is false
    const firstChunk = message.messageChunks[0];
    message.messageChunks.unshift({
      content: ' ',
      styling: firstChunk.styling,
      stylingParams: firstChunk.stylingParams,
      subLine: false,
    });

    const txt = message.messageChunks.map((chunk): string => this.parseTextStyles(chunk, false, shouldColorBg ? defaultSettings.logLevelMainColors[message.logLevel] : undefined));

    this.consoleLoggers[message.logLevel](`${timestamp}${prefixTxt}${level}${txt.join('')}`);

    if (!message.subLines || message.subLines.length <= 0) return;

    message.subLines.forEach((line) =>
      this.consoleLoggers[message.logLevel](this.parseTextStyles(
        line,
        true,
        shouldColorBg ? defaultSettings.logLevelMainColors[message.logLevel] : undefined,
        shouldColorBg ? defaultSettings.logLevelAccentColors[message.logLevel] : undefined,
      )),
    );

    this.consoleLoggers[message.logLevel](
      this.parseTextStyles(
        {
          content: '#'.padEnd(process.stdout.columns, '-'),
          styling: [EStyles.specialSubLine, EStyles.textColor],
          stylingParams: ['', defaultSettings.logLevelAccentColors[message.logLevel] || '#ffffff'],
          subLine: true,
        },
        true,
        shouldColorBg ? defaultSettings.logLevelMainColors[message.logLevel] : undefined,
      ),
    );
  }
}
