import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IRoleBase, Role } from '@digitaldefiance/suite-core-lib';

export type IRoleBackendObject<I extends PlatformID = Buffer> = IRoleBase<
  I,
  Date,
  Role
>;
