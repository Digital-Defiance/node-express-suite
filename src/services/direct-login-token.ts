import {
  DirectTokenUsedError,
  FailedToUseDirectTokenError,
  IUsedDirectLoginTokenBase,
} from '@digitaldefiance/suite-core-lib';
import { ClientSession, Types } from 'mongoose';
import { IBaseDocument } from '../documents';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { BaseModelName } from '../enumerations/base-model-name';
import { Environment } from '../environment';
import { IConstants } from '../interfaces';
import { IApplication } from '../interfaces/application';
import { ModelRegistry } from '../model-registry';
import { withTransaction } from '../utils';
export abstract class DirectLoginTokenService {
  public static async useToken<I extends string | Types.ObjectId = Types.ObjectId>(
    app: IApplication,
    userId: I,
    token: string,
    session?: ClientSession,
  ): Promise<void> {
    return withTransaction(
      app.db.connection,
      app.environment.mongo.useTransactions,
      session,
      async (sess) => {
        const UsedDirectLoginTokenModel = ModelRegistry.instance.get<
          IUsedDirectLoginTokenBase<I>,
          any
        >(BaseModelName.UsedDirectLoginToken).model;
        const tokenExists = await UsedDirectLoginTokenModel.exists({
          userId,
          token,
        }).session(sess ?? null);
        if (tokenExists) {
          throw new DirectTokenUsedError();
        }
        try {
          const newTokens = await UsedDirectLoginTokenModel.create(
            [{ userId, token }],
            {
              session: sess,
            },
          );
          if (newTokens.length !== 1) {
            throw new FailedToUseDirectTokenError();
          }
        } catch (err) {
          // re-throw FailedToUseDirectTokenError
          if (err instanceof FailedToUseDirectTokenError) {
            throw err;
          }
          // throw FailedToUseDirectTokenError on duplicate key error or other errors
          throw new FailedToUseDirectTokenError();
        }
      },
      {
        timeoutMs: app.environment.mongo.transactionTimeout,
      },
    );
  }
}
