import {
  SuiteCoreStringKey,
  TranslatableSuiteHandleableError,
} from '@digitaldefiance/suite-core-lib';

export class MissingValidatedDataError<
  _TLanguage extends string,
  _TContext extends string,
> extends TranslatableSuiteHandleableError {
  public readonly field?: string;
  public readonly fields?: string[];
  constructor(data?: string | string[]) {
    let message: SuiteCoreStringKey;
    let fields: string[] | undefined;
    let field: string;
    if (data && Array.isArray(data)) {
      message =
        SuiteCoreStringKey.Validation_MissingValidatedDataForFieldTemplate;
      field = data.join(', ');
      fields = data;
    } else if (data) {
      message =
        SuiteCoreStringKey.Validation_MissingValidatedDataForFieldTemplate;
      field = String(data);
    } else {
      message = SuiteCoreStringKey.Validation_MissingValidatedData;
      field = '';
    }
    super(message, { field }, undefined, {
      statusCode: 422,
    });
    this.field = field;
    this.fields = fields;
    this.name = 'MissingValidatedDataError';
  }
}
