import { Logger } from './logger';
import { ConsoleEngine } from './outputEngines';

/**
 * Singleton class that handles the end of the program
 */
export class AutoLogEnd {
  private active = false;
  private exited = false;
  private logger!: Logger;
  // eslint-disable-next-line no-use-before-define
  public static _instance?: AutoLogEnd;
  private deconstructors: Map<string, () => Promise<void>> = new Map();
  private deconstructorCallbacks: (() => void)[] = [];
  private runningDeconstructors = false;

  // callbacks
  private exitCallback: (exitCode: number) => Promise<void> = async (exitCode) => { await this.exitHandler({ exitCode }); };
  private sigintCallback: (error: Error) => Promise<void> = async (error) => { await this.exitHandler({ err: error, exitCode: 'SIGINT' }); };
  private sigusr1Callback: (error: Error) => Promise<void> = async (error) => { await this.exitHandler({ err: error, exitCode: 'SIGUSR1' }); };
  private sigusr2Callback: (error: Error) => Promise<void> = async (error) => { await this.exitHandler({ err: error, exitCode: 1 }); };
  private sigtermCallback: (error: Error) => Promise<void> = async (error) => { await this.exitHandler({ err: error, exitCode: 'SIGTERM' }); };
  private uncaughtExceptionCallback: (error: Error) => Promise<void> = async (error: Error) => { await this.exitHandler({ err: error, exitCode: 123654 }); };
  private beforeExitCallback: (code: number) => Promise<void> = async (code: number) => { await this.exitHandler({ exitCode: code }); };

  /**
   * @constructor
   * @param logger (optional) custom logger to be used
   * @returns new instance of AutoLogEnd or the existing one
   */
  constructor(logger?: Logger) {
    if (AutoLogEnd._instance) return AutoLogEnd._instance;

    if (logger) this.logger = logger;
    else {
      this.logger = new Logger({ prefixes: [{ content: 'SYSTEM', color: '#ffaa00', backgroundColor: null }] });
      this.logger.registerListener(new ConsoleEngine({ debug: true }));
    }

    this.activate();

    AutoLogEnd._instance = this;
  }

  async callDeconstructors(): Promise<void> {
    return new Promise((resolve) => {
      if (this.runningDeconstructors) return this.deconstructorCallbacks.push(() => resolve);
      if (this.deconstructors.size === 0) return resolve();
      this.runningDeconstructors = true;
      const promises: Promise<void>[] = [];
      this.deconstructors.forEach((deconstructor) => promises.push(deconstructor()));
      this.deconstructors.clear();
      Promise.all(promises).then(() => {
        this.runningDeconstructors = false;
        this.deconstructorCallbacks.forEach((callback) => callback());
        resolve();
      });
    });
  }

  private async exitHandler({ err, exitCode }: {err?: Error | string, exitCode?: number | string}): Promise<void> {
    if (!this.exited) {
      process.stdin.resume();
      this.exited = true;
      if (typeof exitCode === 'string') this.logger.warn('Manually Finished!');
      else {
        if (exitCode !== 123654 && exitCode !== 647412) this.logger.info('Program finished, code: ' + exitCode ?? '?');
        else if (exitCode && exitCode === 123654 && err) this.logger.error(err);
      }
      this.callDeconstructors().then(() => {
        process.exit(typeof exitCode === 'string' ? 0 : exitCode);
      });
    }
  }

  /**
   * Adds a deconstructor function to be runned before the program exits
   * NOTE: It is uncertain that node.js will execute desconstructor functions that are async.
   * @param id Identifier for the deconstructor
   * @param deconstructor Function to be runned before the program exits
   */
  appendDeconstructor(id: string, deconstructor: () => Promise<void>): void {
    if (this.deconstructors.has(id)) this.logger.warn(`Deconstructor with id ${id} has overwritten!`);
    this.deconstructors.set(id, deconstructor);
  }

  /**
   * Removes a deconstructor function
   * @param id Identifier for the deconstructor
   */
  removeDeconstructor(id: string): void {
    if (!this.deconstructors.has(id)) return this.logger.warn(`Deconstructor with id ${id} not found!`);
    this.deconstructors.delete(id);
  }

  /**
   * Activates the AutoLogEnd
   * @returns void
   **/
  activate(): void {
    if (this.active) return;
    process.on('exit', this.exitCallback);
    process.on('SIGINT', this.sigintCallback);
    process.on('SIGUSR1', this.sigusr1Callback);
    process.on('SIGUSR2', this.sigusr2Callback);
    process.on('SIGTERM', this.sigtermCallback);
    process.on('uncaughtException', this.uncaughtExceptionCallback);
    process.on('beforeExit', this.beforeExitCallback);
    this.active = true;
    this.logger.debug('AutoLogEnd activated!');
  }

  /**
   * Deactivates the AutoLogEnd
   * @returns void
   **/
  deactivate(): void {
    if (!this.activate) return;
    process.removeListener('exit', this.exitCallback);
    process.removeListener('SIGINT', this.sigintCallback);
    process.removeListener('SIGUSR1', this.sigusr1Callback);
    process.removeListener('SIGUSR2', this.sigusr2Callback);
    process.removeListener('SIGTERM', this.sigtermCallback);
    process.removeListener('uncaughtException', this.uncaughtExceptionCallback);
    process.removeListener('beforeExit', this.beforeExitCallback);
    this.active = false;
    this.logger.debug('AutoLogEnd deactivated!');
  }
}
