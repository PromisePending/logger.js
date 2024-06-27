import { IEngineSettings } from './';

export interface IFileStorageSettings extends IEngineSettings {
  logFolderPath: string;
  enableDebugLog?: boolean;
  enableErrorLog?: boolean;
  enableFatalLog?: boolean;
  compressLogFilesAfterNewExecution?: boolean;
}
