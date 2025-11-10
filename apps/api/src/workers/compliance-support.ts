import prisma from '../config/prisma';

export type ComplianceOperation = 'update' | 'delete' | 'flag' | 'noop';

export interface ComplianceScope {
  tenantId?: string;
  userId?: string;
  userIds?: string[];
}

export interface ComplianceJobBase {
  scope?: ComplianceScope;
  dryRun?: boolean;
  triggeredBy?: string;
  note?: string;
}

export interface ComplianceAction {
  userId: string;
  entity: string;
  operation: ComplianceOperation;
  applied: boolean;
  count?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ComplianceJobResult {
  job: string;
  dryRun: boolean;
  scope: ComplianceScope;
  triggeredBy?: string;
  note?: string;
  startedAt: string;
  completedAt: string;
  processedUsers: number;
  actions: ComplianceAction[];
  warnings: string[];
}

export interface ScopedUser {
  id: string;
  email: string;
  marketingOptIn: boolean;
  createdAt: Date;
  updatedAt: Date;
  profileGoals: string[];
  profile: { goals: string[] } | null;
}

interface PrismaUserRecord {
  id: string;
  email: string;
  marketingOptIn: boolean;
  createdAt: Date;
  updatedAt: Date;
  profile: { goals: string[] } | null;
}

const TENANT_GOAL_PREFIX = 'tenant:';

export const isoNow = (): string => new Date().toISOString();

export const auditLog = (
  level: 'info' | 'warn' | 'error',
  message: string,
  meta: Record<string, unknown> = {}
): void => {
  const payload = {
    level,
    message,
    timestamp: isoNow(),
    ...meta
  };

  if (level === 'error') {
    console.error('[compliance]', payload);
    return;
  }

  if (level === 'warn') {
    console.warn('[compliance]', payload);
    return;
  }

  console.info('[compliance]', payload);
};

type UserWhereInput = Record<string, unknown>;

export const buildScopeWhere = (scope?: ComplianceScope): UserWhereInput | undefined => {
  if (!scope) {
    return undefined;
  }

  const conditions: UserWhereInput[] = [];
  const ids = scope.userIds ?? (scope.userId ? [scope.userId] : undefined);

  if (ids && ids.length > 0) {
    if (ids.length === 1) {
      conditions.push({ id: ids[0] });
    } else {
      conditions.push({ id: { in: ids } });
    }
  }

  if (scope.tenantId) {
    const tenantTag = `${TENANT_GOAL_PREFIX}${scope.tenantId}`;

    conditions.push({
      OR: [
        { email: { contains: `@${scope.tenantId}` } },
        {
          profile: {
            is: {
              goals: {
                has: tenantTag
              }
            }
          }
        }
      ]
    });
  }

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { AND: conditions };
};

export const fetchScopedUsers = async (options: {
  scope?: ComplianceScope;
  filters?: UserWhereInput;
}): Promise<ScopedUser[]> => {
  const { scope, filters } = options;

  const scopeWhere = buildScopeWhere(scope);
  let where: UserWhereInput | undefined;

  if (scopeWhere && filters) {
    where = { AND: [scopeWhere, filters] } as UserWhereInput;
  } else {
    where = scopeWhere ?? filters;
  }

  const users = (await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      marketingOptIn: true,
      createdAt: true,
      updatedAt: true,
      profile: {
        select: {
          goals: true
        }
      }
    }
  })) as PrismaUserRecord[];

  return users.map((user: PrismaUserRecord) => ({
    id: user.id,
    email: user.email,
    marketingOptIn: user.marketingOptIn,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profileGoals: user.profile?.goals ?? [],
    profile: user.profile
  }));
};

export const ensureArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

export const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
};

export const inferMissingScopeIds = (scope: ComplianceScope | undefined, resolved: ScopedUser[]): string[] => {
  if (!scope) {
    return [];
  }

  const expectedIds = ensureArray(scope.userIds ?? scope.userId);

  if (expectedIds.length === 0) {
    return [];
  }

  const resolvedIds = new Set(resolved.map((user) => user.id));

  return expectedIds.filter((id) => !resolvedIds.has(id));
};
