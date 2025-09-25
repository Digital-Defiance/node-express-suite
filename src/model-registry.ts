import { Model, Document as MongooseDocument, Schema } from 'mongoose';
import { IBaseDocument } from './documents/base';
import { InvalidModelError } from './errors';

export type ModelRegistration<T, U extends IBaseDocument<T>> = {
  modelName: string;
  schema: Schema;
  model: Model<U>;
  collection: string;
  discriminators?: unknown;
};

class ModelRegistry {
  protected static _instance: ModelRegistry;
  protected _models: Map<string, ModelRegistration<any, IBaseDocument<any>>> =
    new Map();

  private constructor() {}

  public static get instance(): ModelRegistry {
    if (!ModelRegistry._instance) {
      ModelRegistry._instance = new ModelRegistry();
    }
    return ModelRegistry._instance;
  }

  public register<T, U extends IBaseDocument<T>>(
    registration: ModelRegistration<T, U>,
  ): void {
    this._models.set(
      registration.modelName,
      registration as ModelRegistration<T, U>,
    );
  }

  public get<T, U extends IBaseDocument<T>>(
    modelName: string,
  ): ModelRegistration<T, U> {
    const result = this._models.get(modelName) as ModelRegistration<T, U>;
    if (result === undefined) {
      throw new InvalidModelError(modelName);
    }
    return result;
  }

  public getTypedModel<TDoc extends MongooseDocument>(
    modelName: string,
  ): Model<TDoc> {
    const result = this._models.get(modelName);
    if (result === undefined) {
      throw new InvalidModelError(modelName);
    }
    return result.model as Model<TDoc>;
  }

  public getTypedSchema<TDoc extends MongooseDocument>(
    modelName: string,
  ): Schema<TDoc> {
    const result = this._models.get(modelName);
    if (result === undefined) {
      throw new InvalidModelError(modelName);
    }
    return result.schema as Schema<TDoc>;
  }

  public has(modelName: string): boolean {
    return this._models.has(modelName);
  }

  public list(): string[] {
    return Array.from(this._models.keys());
  }
}

export { ModelRegistry };
