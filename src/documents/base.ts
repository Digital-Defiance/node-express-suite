import { Document } from '@digitaldefiance/mongoose-types';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

// Base document interface that extends Mongoose Document
export type IBaseDocument<T, I extends PlatformID = Buffer> = Document<I> & T;
