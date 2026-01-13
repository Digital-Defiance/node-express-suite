/**
 * @fileoverview Model registry for dynamic Mongoose model management.
 * Singleton registry for registering and retrieving Mongoose models.
 * @module model-registry
 */

import {
  Model,
  Document as MongooseDocument,
  Schema,
} from '@digitaldefiance/mongoose-types';
import { IBaseDocument } from './documents/base';
import { InvalidModelError } from './errors';

/**
 * Model registration information.
 * @template T - Document ID type
 * @template U - Document type extending IBaseDocument
 */
export type ModelRegistration<T, U extends IBaseDocument<T>> = {
  modelName: string;
  schema: Schema;
  model: Model<U>;
  collection: string;
  discriminators?: unknown;
};

/**
 * Singleton registry for Mongoose models.
 * Manages model registration and retrieval across the application.
 */
class ModelRegistry {
  protected static _instance: ModelRegistry;
  protected _models: Map<string, ModelRegistration<any, IBaseDocument<any>>> =
    new Map();

  private constructor() {}

  /**
   * Gets the singleton instance of ModelRegistry.
   * @returns {ModelRegistry} The singleton instance
   */
  public static get instance(): ModelRegistry {
    if (!ModelRegistry._instance) {
      ModelRegistry._instance = new ModelRegistry();
    }
    return ModelRegistry._instance;
  }

  /**
   * Registers a model with the registry.
   * @template T - Document ID type
   * @template U - Document type extending IBaseDocument
   * @param {ModelRegistration<T, U>} registration - Model registration information
   */
  public register<T, U extends IBaseDocument<T>>(
    registration: ModelRegistration<T, U>,
  ): void {
    this._models.set(
      registration.modelName,
      registration as ModelRegistration<T, U>,
    );
  }

  /**
   * Retrieves a model registration by name.
   * @template T - Document ID type
   * @template U - Document type extending IBaseDocument
   * @param {string} modelName - Name of the model
   * @returns {ModelRegistration<T, U>} Model registration
   * @throws {InvalidModelError} If model is not registered
   */
  public get<T, U extends IBaseDocument<T>>(
    modelName: string,
  ): ModelRegistration<T, U> {
    const result = this._models.get(modelName) as ModelRegistration<T, U>;
    if (result === undefined) {
      throw new InvalidModelError(modelName);
    }
    return result;
  }

  /**
   * Retrieves a typed Mongoose model by name.
   * @template TDoc - Mongoose document type
   * @param {string} modelName - Name of the model
   * @returns {Model<TDoc>} Mongoose model
   * @throws {InvalidModelError} If model is not registered
   */
  public getTypedModel<TDoc extends MongooseDocument>(
    modelName: string,
  ): Model<TDoc> {
    const result = this._models.get(modelName);
    if (result === undefined) {
      throw new InvalidModelError(modelName);
    }
    return result.model as Model<TDoc>;
  }

  /**
   * Retrieves a typed Mongoose schema by name.
   * @template TDoc - Mongoose document type
   * @param {string} modelName - Name of the model
   * @returns {Schema<TDoc>} Mongoose schema
   * @throws {InvalidModelError} If model is not registered
   */
  public getTypedSchema<TDoc extends MongooseDocument>(
    modelName: string,
  ): Schema<TDoc> {
    const result = this._models.get(modelName);
    if (result === undefined) {
      throw new InvalidModelError(modelName);
    }
    return result.schema as Schema<TDoc>;
  }

  /**
   * Checks if a model is registered.
   * @param {string} modelName - Name of the model
   * @returns {boolean} True if model exists
   */
  public has(modelName: string): boolean {
    return this._models.has(modelName);
  }

  /**
   * Lists all registered model names.
   * @returns {string[]} Array of model names
   */
  public list(): string[] {
    return Array.from(this._models.keys());
  }
}

export { ModelRegistry };
