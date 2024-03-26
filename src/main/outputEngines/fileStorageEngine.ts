import { ELoggerLevel, ELoggerLevelNames, EStyles, IFileStorageSettings, ILogMessage, IMessageChunk } from '../interfaces';
import { Logger } from '../logger';
import { Engine } from './';

export default class FileStorage extends Engine {
  constructor(settings?: IFileStorageSettings, ...loggers: Logger[]) {
    super(settings, ...loggers);
    let a;
  }

  private parseTextStyles(chunk: IMessageChunk, subLine?: boolean): string {
    let special = false;
    chunk.styling.forEach((style) => {
      switch (style) {
        case EStyles.specialSubLine:
          special = true;
          break;
        default:
          break;
      }
    });
    return (subLine && !special ? '|  ' : '') + chunk.content;
  }

  log(message: ILogMessage): void {
    if (!this.debug && message.logLevel === ELoggerLevel.DEBUG) return;

    const defaultSettings = message.settings.default;

    const timestamp = this.getTime(message.timestamp);

    const prefixes = message.prefixes;

    const prefixTxt = prefixes.map((prefix) => ` [${prefix}]`);
    const level = ` ${ELoggerLevelNames[message.logLevel]}: `;

    const txt = message.messageChunks.map((chunk): string => this.parseTextStyles(chunk, false));

    // this.consoleLoggers[message.logLevel](`${timestamp}${prefixTxt}${level}${txt.join('')}`);

    if (!message.subLines || message.subLines.length <= 0) return;

    let biggestLine = 0;
    message.subLines.forEach((line) => {
      if (line.content.length > biggestLine) biggestLine = line.content.length;
      // this.consoleLoggers[message.logLevel](this.parseTextStyles(line, true));
    });

    this.consoleLoggers[message.logLevel](
      this.parseTextStyles({
        content: '#'.padEnd(biggestLine, '-'),
        styling: [EStyles.specialSubLine],
        stylingParams: [''],
        subLine: true,
      },
      true,
      ),
    );
  }
}
