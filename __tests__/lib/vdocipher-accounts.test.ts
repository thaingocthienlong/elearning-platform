import { readFileSync } from 'fs';
import path from 'path';

import {
  listVdoCipherAccounts,
  resolveVdoCipherAccount,
  getVdoCipherAccountEnvSuffix,
} from '@/lib/vdocipher-accounts';

describe('vdocipher account registry', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.VDOCIPHER_ACCOUNT_IDS;
    delete process.env.VDOCIPHER_DEFAULT_ACCOUNT_ID;
    delete process.env.VDOCIPHER_API_SECRET_PRIMARY;
    delete process.env.VDOCIPHER_API_SECRET_BACKUP_1;
    delete process.env.VDOCIPHER_API_SECRET_BACKUP;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('normalizes account IDs for env suffixes', () => {
    expect(getVdoCipherAccountEnvSuffix('backup-1')).toBe('BACKUP_1');
    expect(getVdoCipherAccountEnvSuffix('primary')).toBe('PRIMARY');
  });

  it('keeps the registry server-only', () => {
    const source = readFileSync(path.join(process.cwd(), 'src/lib/vdocipher-accounts.ts'), 'utf8');

    expect(source.startsWith("import 'server-only';")).toBe(true);
  });

  it('lists configured accounts without exposing secrets', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = 'primary,backup-1';
    process.env.VDOCIPHER_DEFAULT_ACCOUNT_ID = 'primary';
    process.env.VDOCIPHER_API_SECRET_PRIMARY = 'secret-a';
    process.env.VDOCIPHER_API_SECRET_BACKUP_1 = 'secret-b';

    expect(listVdoCipherAccounts()).toEqual([
      { id: 'primary', isDefault: true, configured: true },
      { id: 'backup-1', isDefault: false, configured: true },
    ]);
  });

  it('resolves requested account secret', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = 'primary,backup-1';
    process.env.VDOCIPHER_DEFAULT_ACCOUNT_ID = 'primary';
    process.env.VDOCIPHER_API_SECRET_PRIMARY = 'secret-a';
    process.env.VDOCIPHER_API_SECRET_BACKUP_1 = 'secret-b';

    expect(resolveVdoCipherAccount('backup-1')).toEqual({
      id: 'backup-1',
      apiSecret: 'secret-b',
      isDefault: false,
    });
  });

  it('uses default account when request omits account', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = 'primary';
    process.env.VDOCIPHER_DEFAULT_ACCOUNT_ID = 'primary';
    process.env.VDOCIPHER_API_SECRET_PRIMARY = 'secret-a';

    expect(resolveVdoCipherAccount()).toEqual({
      id: 'primary',
      apiSecret: 'secret-a',
      isDefault: true,
    });
  });

  it('throws when configured default account is not registered', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = 'primary,backup-1';
    process.env.VDOCIPHER_DEFAULT_ACCOUNT_ID = 'missing';
    process.env.VDOCIPHER_API_SECRET_PRIMARY = 'secret-a';
    process.env.VDOCIPHER_API_SECRET_BACKUP_1 = 'secret-b';

    expect(() => resolveVdoCipherAccount()).toThrow('Unknown default VdoCipher account: missing');
    expect(() => listVdoCipherAccounts()).toThrow('Unknown default VdoCipher account: missing');
  });

  it('rejects account IDs with duplicate normalized env suffixes', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = 'backup-1,backup_1';
    process.env.VDOCIPHER_API_SECRET_BACKUP_1 = 'secret-b';

    expect(() => listVdoCipherAccounts()).toThrow(
      'Duplicate VdoCipher account env suffix BACKUP_1 for accounts: backup-1, backup_1'
    );
    expect(() => resolveVdoCipherAccount('backup-1')).toThrow(
      'Duplicate VdoCipher account env suffix BACKUP_1 for accounts: backup-1, backup_1'
    );
  });

  it('treats blank account ID config as the primary default account', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = '   ';
    process.env.VDOCIPHER_API_SECRET_PRIMARY = 'secret-a';

    expect(listVdoCipherAccounts()).toEqual([{ id: 'primary', isDefault: true, configured: true }]);
    expect(resolveVdoCipherAccount()).toEqual({
      id: 'primary',
      apiSecret: 'secret-a',
      isDefault: true,
    });
  });

  it('throws for unknown requested account', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = 'primary';
    process.env.VDOCIPHER_API_SECRET_PRIMARY = 'secret-a';

    expect(() => resolveVdoCipherAccount('missing')).toThrow('Unknown VdoCipher account: missing');
  });

  it('throws for configured account missing secret', () => {
    process.env.VDOCIPHER_ACCOUNT_IDS = 'primary';

    expect(() => resolveVdoCipherAccount('primary')).toThrow('Missing VdoCipher API secret for account: primary');
  });
});
