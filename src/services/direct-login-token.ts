import {
  DirectTokenUsedError,
  FailedToUseDirectTokenError,
  IUsedDirectLoginTokenBase,
} from '@digitaldefiance/suite-core-lib';
import { ClientSession, Types } from 'mongoose';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { BaseModelName } from '../enumerations/base-model-name';
import { IApplication } from '../interfaces/application';
import { ModelRegistry } from '../model-registry';
import { withTransaction } from '../utils';
import { IBaseDocument } from '../documents';
import { Environment } from '../environment';
import { IConstants } from '../interfaces';
export abstract class DirectLoginTokenService {
  public static async useToken(
    app: IApplication<any, Types.ObjectId, IBaseDocument<any, Types.ObjectId>, Environment, IConstants>,
    userId: Types.ObjectId,
    token: string,
    session?: ClientSession,
  ): Promise<void> {
    return withTransaction(
      app.db.connection,
      app.environment.mongo.useTransactions,
      session,
      async (sess) => {
        const UsedDirectLoginTokenModel = ModelRegistry.instance.get<
          IUsedDirectLoginTokenBase<Types.ObjectId>,
          IUsedDirectLoginTokenDocument
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
