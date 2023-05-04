/* eslint-disable no-unused-vars */

export enum ELoggerLevel {
  INFO = 0,
  LOG = 0,
  WARN = 1,
  ALERT = 1,
  ERROR = 2,
  SEVERE = 2,
  FATAL = 3,
  DEBUG = 4
}

export interface ILoggerFileProperties {
  enable: boolean;
  logFolderPath: string;
  enableLatestLog?: boolean;
  enableDebugLog?: boolean;
  enableErrorLog?: boolean;
  enableFatalLog?: boolean;
  generateHTMLLog?: boolean;
  compressLogFilesAfterNewExecution?: boolean;
}

export interface ILoggerOptions {
  defaultLevel?: ELoggerLevel;
  prefix?: string;
  debug?: boolean;
  coloredBackground?: boolean;
  allLineColored?: boolean;
  disableFatalCrash?: boolean;
  fileProperties?: ILoggerFileProperties
}
