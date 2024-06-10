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
  causedByTextColor?: string,
  causedByBackgroundColor?: string,
  variableStyling: EStyles[],
  variableStylingParams: string[],
  primitiveColors: {
    string: string,
    number: string,
    boolean: string,
    null: string,
    undefined: string,
    circular: string,
  },
}
