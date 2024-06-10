import { IDefault } from './IDefault';
import { ELoggerLevel } from './ILogMessage';

export interface IPrefix {
  content: string;
  color: ((text: string) => string | string[]) | string | string[];
  backgroundColor: ((text: string) => string | string[]) | string | string[] | null;
}

export interface ISharedLogSettings {
  coloredBackground?: boolean;
}

export interface ILogSettings extends ISharedLogSettings {
  default: IDefault;
}

export interface ILoggerOptions extends ISharedLogSettings {
  defaultLevel?: ELoggerLevel;
  prefixes: (IPrefix | string)[];
  disableFatalCrash?: boolean;
  redactedContent?: string[];
  allLineColored?: boolean;
  defaultSettings?: IDefault;
}
