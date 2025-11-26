import { IRoleBase, Role } from '@digitaldefiance/suite-core-lib';
import { Types } from '@digitaldefiance/mongoose-types';

export type IRoleBackendObject<I extends string | Types.ObjectId = Types.ObjectId> = IRoleBase<I, Date, Role>;
