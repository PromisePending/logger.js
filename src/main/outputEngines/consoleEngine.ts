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
    let textStyler = subLine ? (backgroundColor ? chalk.bgHex(backgroundColor).gray : chalk.gray) : chalk.reset;
    chunk.styling.forEach((style, index) => {
      switch (style) {
        case EStyles.bold:
          textStyler = textStyler.bold;
          break;
        case EStyles.italic:
          textStyler = textStyler.italic;
          break;
        case EStyles.backgroundColor:
          textStyler = textStyler.bgHex(chunk.stylingParams[index]);
          break;
        case EStyles.textColor:
          textStyler = textStyler.hex(chunk.stylingParams[index]);
          break;
        case EStyles.reset:
          textStyler = textStyler.reset;
          break;
        default:
          break;
      }
    });
    const txt = subLine ? (`${!chunk.styling.includes(EStyles.specialSubLine) && chunk.breaksLine ? '|  ' : ''}${chunk.content}`) : chunk.content;
    return (customFGColor ? textStyler.hex(customFGColor)(txt) : textStyler(txt));
  }

  private parsePrefix(prefixes: IPrefix[], defaultBg?: string, dontSaveCache?: boolean): (string | undefined)[] {
    return prefixes.map((prefix) => {
      // if theres cache for this prefix return it
      if (this.prefixes.has(prefix.content)) return this.prefixes.get(prefix.content);

      // calculates the backgroundColor for the prefix
      let bgColor = ''; // used if single color background color
      let bgColorArray: string[] = []; // used if multiple background colors
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

      // calculates the text color for the prefix
      let fgColor = ''; // used if single color
      let fgArray: string[] = []; // used if different colors for different characters
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
        if (!dontSaveCache) this.prefixes.set(prefix.content, result);
        return result;
      }
      if (!bgColor && bgColorArray.length <= 0 && fgColor) {
        const result = (defaultBg ? chalk.bgHex(defaultBg) : chalk).hex(fgColor)(prefix.content);
        if (!dontSaveCache) this.prefixes.set(prefix.content, result);
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

      // saves to cache
      if (!dontSaveCache) this.prefixes.set(prefix.content, finalMsg);
      return finalMsg;
    });
  }

  /**
   * Logs a message to the console
   * @param message The message to be logged
   * @returns void
   */
  log(message: ILogMessage): void {
    if (!this.debug && message.logLevel === ELoggerLevel.DEBUG) return;

    const defaultSettings = message.settings.default;
    const isFatal = message.logLevel === ELoggerLevel.FATAL;
    const shouldColorBg = message.settings.coloredBackground || isFatal;
    const currentMainColor = shouldColorBg ? defaultSettings.logLevelMainColors[message.logLevel] : undefined;
    const currentAccentColor = shouldColorBg ? defaultSettings.logLevelAccentColors[message.logLevel] : undefined;

    // clears prefixes cache in order to apply correct background color
    if (shouldColorBg) this.prefixes.clear();

    let styleText = currentMainColor ? chalk.bgHex(currentMainColor) : chalk.reset;
    styleText = !shouldColorBg ? styleText.hex(defaultSettings.logLevelMainColors[message.logLevel]) : (currentAccentColor ? styleText.hex(currentAccentColor) : styleText);

    const timestamp = styleText(this.getTime(message.timestamp));

    const prefixes = this.parsePrefix(message.prefixes, currentMainColor, isFatal).map((prefix) => `${styleText(' [')}${prefix}${styleText(']')}`).join('');
    const logKind = styleText(` ${ELoggerLevelNames[message.logLevel]}:`);

    // adds a space before the first chunk to separate the message from the : in the log without coloring the background if allLineColored is false
    const firstChunk = message.messageChunks[0];
    message.messageChunks.unshift({
      content: ' ',
      styling: firstChunk.styling,
      stylingParams: firstChunk.stylingParams,
      subLine: false,
      breaksLine: false,
    });

    const parsedText = message.messageChunks.map((chunk): string => this.parseTextStyles(chunk, false, currentMainColor)).join('');

    // writes the final log into the console
    this.consoleLoggers[message.logLevel](`${timestamp}${prefixes}${logKind}${parsedText}`);

    if (!message.subLines || message.subLines.length <= 0) return;

    const subLinesBuffer: string[] = [];
    let lineBuffer = '';
    let lineSizeBuffer = 0;
    message.subLines.forEach((line, index, arr) => {
      lineBuffer += this.parseTextStyles(line, true, currentMainColor, currentAccentColor);
      lineSizeBuffer += line.content.length;
      if (arr[index + 1]?.breaksLine || index === arr.length - 1) {
        const spaceFill = ''.padEnd(process.stdout.columns - lineSizeBuffer - 3);
        subLinesBuffer.push(lineBuffer + this.parseTextStyles({
          content: spaceFill,
          styling: line.styling,
          stylingParams: line.stylingParams,
          subLine: true,
          breaksLine: false,
        }, true, currentMainColor, currentAccentColor));
        lineBuffer = '';
        lineSizeBuffer = 0;
      }
    });
    this.consoleLoggers[message.logLevel](subLinesBuffer.join('\n'));

    // prints an indication at the end of the sublines
    this.consoleLoggers[message.logLevel](
      this.parseTextStyles(
        {
          content: '#'.padEnd(process.stdout.columns, '-'),
          styling: [EStyles.specialSubLine],
          stylingParams: [''],
          subLine: true,
          breaksLine: false,
        },
        true,
        currentMainColor,
        currentAccentColor,
      ),
    );
  }
}
