/**
 * @jest-environment node
 */
import type { AdapterUser } from 'next-auth/adapters';

type NewAdapterUser = Omit<AdapterUser, 'id' | 'role'> &
  Partial<Pick<AdapterUser, 'role'>>;

const mockAllowedEmailFindUnique = jest.fn();
const mockUserCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    allowedEmail: {
      findUnique: mockAllowedEmailFindUnique,
    },
    user: {
      create: mockUserCreate,
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/session-revocation', () => ({
  revokeAllSessionsForUser: jest.fn(),
}));

describe('auth whitelist user creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserCreate.mockImplementation(async ({ data }) => ({
      id: 'user-1',
      ...data,
    }));
  });

  test('creates first-login whitelisted users with whitelist fullname instead of Google name', async () => {
    const { authOptions } = await import('@/lib/auth');
    mockAllowedEmailFindUnique.mockResolvedValue({
      email: 'learner@example.com',
      fullname: 'Whitelist Name',
    });

    const createUserInput: NewAdapterUser = {
      email: 'learner@example.com',
      emailVerified: null,
      image: null,
      name: 'Google Name',
    };

    const createdUser = await authOptions.adapter?.createUser?.(createUserInput);

    expect(mockUserCreate).toHaveBeenCalledWith({
      data: {
        ...createUserInput,
        name: 'Whitelist Name',
      },
    });
    expect(createdUser?.name).toBe('Whitelist Name');
  });
});
