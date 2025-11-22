import { IRoleBase, Role } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';

export type IRoleBackendObject<I extends string | Types.ObjectId = Types.ObjectId> = IRoleBase<I, Date, Role>;
