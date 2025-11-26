import { Error } from '@digitaldefiance/mongoose-types';

export interface IMongoErrors {
  [key: string]: Error.ValidatorError | Error.CastError;
}
