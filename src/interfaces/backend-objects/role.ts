import { Types } from '@digitaldefiance/mongoose-types';
import { IRoleBase, Role } from '@digitaldefiance/suite-core-lib';

export type IRoleBackendObject<
  I extends string | Types.ObjectId = Types.ObjectId,
> = IRoleBase<I, Date, Role>;
