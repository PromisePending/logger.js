import { EStyles } from './ILogMessage';

export interface IDefault {
  logLevelMainColors: {
    [key: number]: string,
  },
  logLevelAccentColors: {
    [key: number]: string,
  },
  prefixMainColor: string,
  prefixAccentColor: string,
  redactionText: string,
  undefinedColor: string,
  causedByTextColor?: string,
  causedByBackgroundColor?: string,
  variableStyling: EStyles[],
  variableStylingParams: string[],
}
