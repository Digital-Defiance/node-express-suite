import { IECIESConstants } from '@digitaldefiance/ecies-lib';
import { IConstants as IBaseConstants } from '@digitaldefiance/suite-core-lib';
import { IChecksumConsts } from './checksum-consts';
import { IFECConsts } from './fec-consts';
import { IJwtConsts } from './jwt-consts';

export interface IConstants extends IBaseConstants {
  CHECKSUM: IChecksumConsts;
  JWT: IJwtConsts;
  FEC: IFECConsts;
  ECIES: IECIESConstants;
}
