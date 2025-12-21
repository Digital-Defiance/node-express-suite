import { ISimpleCSPDef, isSimpleCSPDef } from './csp-definition';

export interface ICSPConfig {
  corsWhitelist: string[];
  csp: ISimpleCSPDef;
}

export const isCSPConfig = (obj: any): obj is ICSPConfig => {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'corsWhitelist' in obj &&
    'csp' in obj &&
    isSimpleCSPDef(obj.csp)
  );
};
