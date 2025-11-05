import { IApplication } from '../interfaces/application';

export interface IApplicationPlugin {
  readonly name: string;
  readonly version?: string;
  init(app: IApplication): Promise<void>;
  stop?(): Promise<void>;
}
