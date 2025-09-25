import { Document, Types } from 'mongoose';

// Base document interface that extends Mongoose Document
export type IBaseDocument<
  T,
  I extends Types.ObjectId | string = Types.ObjectId,
> = Document<I> & T;
