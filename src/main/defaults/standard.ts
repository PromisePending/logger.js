import { EStyles } from '../interfaces';
import { IDefault } from '../interfaces/IDefault';

export default {
  logLevelMainColors: {
    0: '#cc80ff',
    1: '#ff8a1c',
    2: '#ff4a4a',
    3: '#ffffff',
    4: '#555555',
  },
  logLevelAccentColors: {
    0: '#ffffff',
    1: '#ffffff',
    2: '#ffffff',
    3: '#ff0000',
    4: '#ffffff',
  },
  prefixMainColor: '#777777',
  prefixAccentColor: '#000000',
  redactionText: '[REDACTED]',
  undefinedColor: '#5555aa',
  causedByTextColor: '#ffffff',
  causedByBackgroundColor: '#ff0000',
  variableStyling: [EStyles.bold, EStyles.textColor],
  variableStylingParams: ['', '#55ff55'],
} as IDefault;
