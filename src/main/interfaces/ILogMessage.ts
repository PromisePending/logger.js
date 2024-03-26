import { ILogSettings, IPrefix } from "./ILoggerOption";

export enum EStyles {
  bold = 1,
  italic = 2,
  textColor = 3,
  backgroundColor = 4,
  specialSubLine = 5,
  reset = 6,
}

export enum ELoggerLevel {
  INFO = 0,
  WARN = 1,
  ALERT = 1,
  ERROR = 2,
  SEVERE = 2,
  FATAL = 3,
  DEBUG = 4
}

export enum ELoggerLevelNames {
  'INFO',
  'WARN',
  'ERROR',
  'FATAL',
  'DEBUG'
}

export interface IMessageChunk {
  content: string;
  styling: EStyles[];
  stylingParams: string[];
  subLine: boolean;
}

export interface ILogMessage {
  messageChunks: IMessageChunk[];
  subLines: IMessageChunk[];
  prefixes: IPrefix[];
  timestamp: Date;
  logLevel: ELoggerLevel;
  settings: ILogSettings;
}
