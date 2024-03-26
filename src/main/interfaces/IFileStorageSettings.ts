import { IEngineSettings } from './';

export interface IFileStorageSettings extends IEngineSettings {
  logFolderPath: string;
  enableLatestLog?: boolean;
  enableDebugLog?: boolean;
  enableErrorLog?: boolean;
  enableFatalLog?: boolean;
  compressLogFilesAfterNewExecution?: boolean;
}
