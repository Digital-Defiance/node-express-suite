import { Document, Types } from 'mongoose';

// Supported ID types for documents
export type SupportedIdType = Types.ObjectId | string;

// Base document interface that extends Mongoose Document
export type IBaseDocument<
  T,
  I extends SupportedIdType = Types.ObjectId,
> = Document<I> & T;
