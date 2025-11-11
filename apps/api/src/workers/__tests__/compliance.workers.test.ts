import { performConsentRevocation } from '../consent-revocation.worker';
import { performDataRetention } from '../data-retention.worker';
import { performPartnerSegregation } from '../partner-segregation.worker';
import prisma from '../../config/prisma';

type AsyncMock<TResult = unknown> = jest.Mock<Promise<TResult>, []>;
type TransactionCallback = (tx: MockPrismaClient) => Promise<unknown>;

function createAsyncMock<TResult = unknown>(): AsyncMock<TResult> {
  return jest.fn<Promise<TResult>, []>();
}

interface MockPrismaClient {
  user: {
    findMany: AsyncMock;
    update: AsyncMock;
    delete: AsyncMock;
  };
  notificationPreference: {
    findUnique: AsyncMock;
    deleteMany: AsyncMock;
    count: AsyncMock<number>;
  };
  notification: {
    count: AsyncMock<number>;
    updateMany: AsyncMock;
    deleteMany: AsyncMock;
    findMany: AsyncMock;
    update: AsyncMock;
  };
  resumeIngestion: {
    count: AsyncMock<number>;
    deleteMany: AsyncMock;
    findMany: AsyncMock;
    update: AsyncMock;
  };
  assessment: {
    count: AsyncMock<number>;
    updateMany: AsyncMock;
    deleteMany: AsyncMock;
  };
  profile: {
    findUnique: AsyncMock;
    deleteMany: AsyncMock;
  };
  $transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
}

function createMockPrisma(): MockPrismaClient {
  const mock: MockPrismaClient = {
    user: {
      findMany: createAsyncMock(),
      update: createAsyncMock(),
      delete: createAsyncMock()
    },
    notificationPreference: {
      findUnique: createAsyncMock(),
      deleteMany: createAsyncMock(),
      count: createAsyncMock<number>()
    },
    notification: {
      count: createAsyncMock<number>(),
      updateMany: createAsyncMock(),
      deleteMany: createAsyncMock(),
      findMany: createAsyncMock(),
      update: createAsyncMock()
    },
    resumeIngestion: {
      count: createAsyncMock<number>(),
      deleteMany: createAsyncMock(),
      findMany: createAsyncMock(),
      update: createAsyncMock()
    },
    assessment: {
      count: createAsyncMock<number>(),
      updateMany: createAsyncMock(),
      deleteMany: createAsyncMock()
    },
    profile: {
      findUnique: createAsyncMock(),
      deleteMany: createAsyncMock()
    },
    $transaction: jest.fn<Promise<unknown>, [TransactionCallback]>()
  };

  mock.$transaction.mockImplementation(async (callback) => callback(mock));

  return mock;
}

jest.mock('../../config/prisma', () => {
  const mockPrisma = createMockPrisma();
  return {
    __esModule: true,
    default: mockPrisma,
    prisma: mockPrisma
  };
});

jest.mock('../../config/queue', () => {
  const registerQueueMock = jest.fn(() => ({
    queue: undefined,
    worker: undefined,
    events: undefined
  }));

  return {
    __esModule: true,
    registerQueue: registerQueueMock,
    default: registerQueueMock
  };
});

const prismaMock = prisma as unknown as MockPrismaClient;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('compliance workers dry-run behaviour', () => {
  it('summarises consent revocation actions without mutations during dry-run', async () => {
    const now = new Date('2024-01-01T00:00:00Z');
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        email: 'user-1@acme.org',
        marketingOptIn: true,
        createdAt: now,
        updatedAt: now,
        profile: { goals: [] }
      }
    ]);
    prismaMock.notificationPreference.findUnique.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1'
    });
    prismaMock.notification.count.mockResolvedValue(3);
    prismaMock.assessment.count.mockResolvedValue(2);

    const result = await performConsentRevocation({
      dryRun: true,
      scope: { userIds: ['user-1'] },
      note: 'integration-test'
    });

    expect(result.dryRun).toBe(true);
    expect(result.processedUsers).toBe(1);
    const userAction = result.actions.find((action) => action.entity === 'User');
    expect(userAction?.operation).toBe('update');
    expect(userAction?.applied).toBe(false);
    const notificationAction = result.actions.find((action) => action.entity === 'Notification');
    expect(notificationAction?.count).toBe(3);
    expect(notificationAction?.applied).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('reports data retention deletions without mutating records during dry-run', async () => {
    const older = new Date('2022-01-01T00:00:00Z');
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'user-42',
        email: 'legacy@tenant.io',
        marketingOptIn: false,
        createdAt: older,
        updatedAt: older,
        profile: { goals: [] }
      }
    ]);
    prismaMock.notification.count.mockResolvedValue(4);
    prismaMock.resumeIngestion.count.mockResolvedValue(2);
    prismaMock.assessment.count.mockResolvedValue(3);
    prismaMock.notificationPreference.count.mockResolvedValue(1);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'profile-42' });

    const result = await performDataRetention({
      dryRun: true,
      scope: { tenantId: 'tenant' },
      before: '2023-01-01T00:00:00Z'
    });

    expect(result.dryRun).toBe(true);
    expect(result.processedUsers).toBe(1);
    const userAction = result.actions.find((action) => action.entity === 'User');
    expect(userAction?.operation).toBe('delete');
    expect(userAction?.applied).toBe(false);
    const resumeAction = result.actions.find((action) => action.entity === 'ResumeIngestion');
    expect(resumeAction?.count).toBe(2);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('identifies partner segregation mismatches during dry-run', async () => {
    const now = new Date('2024-01-01T00:00:00Z');
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'user-seg',
        email: 'user-seg@orbit.example',
        marketingOptIn: true,
        createdAt: now,
        updatedAt: now,
        profile: { goals: [] }
      }
    ]);
    prismaMock.resumeIngestion.findMany.mockResolvedValue([
      {
        id: 'ing-1',
        ingestionMetadata: { partnerId: 'legacy', tenantId: 'legacy' }
      },
      {
        id: 'ing-2',
        ingestionMetadata: null
      }
    ]);
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'notif-1',
        actions: { partnerId: 'legacy' }
      }
    ]);

    const result = await performPartnerSegregation({
      dryRun: true,
      scope: { tenantId: 'orbit' }
    });

    expect(result.dryRun).toBe(true);
    expect(result.processedUsers).toBe(1);
    const resumeAction = result.actions.find((action) => action.entity === 'ResumeIngestion');
    expect(resumeAction?.count).toBe(2);
    const notificationAction = result.actions.find((action) => action.entity === 'Notification');
    expect(notificationAction?.count).toBe(1);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
