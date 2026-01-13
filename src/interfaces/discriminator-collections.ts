/**
 * @fileoverview Discriminator collections interface.
 * Defines structure for Mongoose discriminator model collections.
 * @module interfaces/discriminator-collections
 */

import { Model } from '@digitaldefiance/mongoose-types';
import { IBaseDocument } from '../documents/base';

/**
 * Collections of discriminator models.
 * @template T - Document type extending IBaseDocument
 */
export interface IDiscriminatorCollections<T extends IBaseDocument<any>> {
  byType: Record<string, Model<T>>;
  array: Array<Model<T>>;
}
