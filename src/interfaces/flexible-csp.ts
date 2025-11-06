import { HelmetOptions } from 'helmet';
import { isHelmetOptions } from '../middlewares';
import { ISimpleCSPDef, isSimpleCSPDef } from './csp-definition';

export interface IFlexibleCSP {
  corsWhitelist: string[],
  csp: ISimpleCSPDef| HelmetOptions,
}

export const isFlexibleCSP = (obj: any): obj is IFlexibleCSP => {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'corsWhitelist' in obj &&
    'csp' in obj &&
    (isSimpleCSPDef(obj.csp) || isHelmetOptions(obj.csp))
  );
}