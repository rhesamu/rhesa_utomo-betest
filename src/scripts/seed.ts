import { Types } from 'mongoose';
import { env } from '../config/env';
import { BcryptHasher } from '../infra/hash/BcryptHasher';
import { createRedisClient } from '../infra/cache/createRedisClient';
import { Role, UserModel } from '../modules/User/user.model';
import { AccountModel } from '../modules/Account/account.model';
import { runScript, scriptLogger, hasFlag } from './lib/runScript';

const DEMO_PASSWORD = 'Password123!';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * MS_PER_DAY);

interface SeedRecord {
  fullName: string;
  accountNumber: string;
  emailAddress: string;
  registrationNumber: string;
  role: Role;
  userName: string;
  lastLoginDays?: number;
}

const SEED_RECORDS: SeedRecord[] = [
  {
    fullName: 'Super Admin',
    accountNumber: 'ACC-100001',
    emailAddress: 'super.admin@example.com',
    registrationNumber: 'REG-2026-001',
    role: 'admin',
    userName: 'super_admin',
    lastLoginDays: 0,
  },
  {
    fullName: 'Dewi Anggraeni',
    accountNumber: 'ACC-100002',
    emailAddress: 'dewi.anggraeni@example.com',
    registrationNumber: 'REG-2026-002',
    role: 'admin',
    userName: 'dewi_anggraeni',
    lastLoginDays: 1,
  },
  {
    fullName: 'Rizky Pratama',
    accountNumber: 'ACC-100003',
    emailAddress: 'rizky.pratama@example.com',
    registrationNumber: 'REG-2026-003',
    role: 'admin',
    userName: 'rizky_pratama',
    lastLoginDays: 2,
  },
  {
    fullName: 'Putri Maharani',
    accountNumber: 'ACC-100004',
    emailAddress: 'putri.maharani@example.com',
    registrationNumber: 'REG-2026-004',
    role: 'user',
    userName: 'putri_maharani',
    lastLoginDays: 5,
  },
  {
    fullName: 'Eko Nugroho',
    accountNumber: 'ACC-100005',
    emailAddress: 'eko.nugroho@example.com',
    registrationNumber: 'REG-2026-005',
    role: 'user',
    userName: 'eko_nugroho',
    lastLoginDays: 12,
  },
  {
    fullName: 'Taufik Hidayat',
    accountNumber: 'ACC-100006',
    emailAddress: 'taufik.hidayat@example.com',
    registrationNumber: 'REG-2026-006',
    role: 'admin',
    userName: 'taufik_hidayat',
    lastLoginDays: 45,
  },
  {
    fullName: 'Budi Wijaya',
    accountNumber: 'ACC-100007',
    emailAddress: 'budi.wijaya@example.com',
    registrationNumber: 'REG-2026-007',
    role: 'user',
    userName: 'budi_wijaya',
  },
  {
    fullName: 'Rina Handayani',
    accountNumber: 'ACC-100008',
    emailAddress: 'rina.handayani@example.com',
    registrationNumber: 'REG-2026-008',
    role: 'admin',
    userName: 'rina_handayani',
  },
  {
    fullName: 'Clarissa Wijaya',
    accountNumber: 'ACC-100009',
    emailAddress: 'clarissa.wijaya@example.com',
    registrationNumber: 'REG-2026-009',
    role: 'user',
    userName: 'clarissa_wijaya',
    lastLoginDays: 3,
  },
  {
    fullName: 'Muhammad Adrian',
    accountNumber: 'ACC-100010',
    emailAddress: 'muhammad.adrian@example.com',
    registrationNumber: 'REG-2026-010',
    role: 'admin',
    userName: 'muhammad_adrian',
    lastLoginDays: 7,
  },
  {
    fullName: 'Ayu Lestari',
    accountNumber: 'ACC-100011',
    emailAddress: 'ayu.lestari@example.com',
    registrationNumber: 'REG-2026-011',
    role: 'admin',
    userName: 'ayu_lestari',
    lastLoginDays: 20,
  },
  {
    fullName: 'Kevin Michael',
    accountNumber: 'ACC-100012',
    emailAddress: 'kevin.michael@example.com',
    registrationNumber: 'REG-2026-012',
    role: 'user',
    userName: 'kevin_michael',
  },
];

async function wipe(): Promise<void> {
  if (env.NODE_ENV === 'production' && !hasFlag('--force')) {
    throw new Error(
      '--fresh deletes all users and accounts. In production, add --force to confirm: ' +
        'npm run db:seed -- --fresh --force',
    );
  }
  const [users, accounts] = await Promise.all([
    UserModel.deleteMany({}),
    AccountModel.deleteMany({}),
  ]);
  scriptLogger.warn(
    `[seed] --fresh removed ${users.deletedCount} users and ${accounts.deletedCount} accounts`,
  );
  await clearUserCache();
}

async function clearUserCache(): Promise<void> {
  const redis = createRedisClient(env.REDIS_URL, scriptLogger);
  if (!redis) return;

  try {
    await redis.connect();
    let cursor = '0';
    let removed = 0;
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', 'user:*', 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) removed += await redis.del(...keys);
    } while (cursor !== '0');
    scriptLogger.info(`[seed] cleared ${removed} cached user keys`);
  } catch (err) {
    scriptLogger.warn({ err }, '[seed] could not clear cache; entries will expire via TTL');
  } finally {
    await redis.quit().catch(() => undefined);
  }
}

async function seed(): Promise<void> {
  if (hasFlag('--fresh')) {
    await wipe();
  }

  const existing = await UserModel.countDocuments({});
  if (existing > 0) {
    scriptLogger.info(
      `[seed] ${existing} users already present; nothing to do. Re-run with --fresh to reseed.`,
    );
    return;
  }

  const hasher = new BcryptHasher();

  for (const record of SEED_RECORDS) {
    const user = await UserModel.create({
      fullName: record.fullName,
      accountNumber: record.accountNumber,
      emailAddress: record.emailAddress,
      registrationNumber: record.registrationNumber,
      role: record.role,
    });

    await AccountModel.create({
      userName: record.userName,
      password: await hasher.hash(DEMO_PASSWORD),
      userId: user._id as Types.ObjectId,
      lastLoginDateTime:
        record.lastLoginDays === undefined ? undefined : daysAgo(record.lastLoginDays),
    });
  }

  const staleCount = SEED_RECORDS.filter(
    (r) => r.lastLoginDays !== undefined && r.lastLoginDays > 3,
  ).length;
  const neverLoggedIn = SEED_RECORDS.filter((r) => r.lastLoginDays === undefined).length;

  scriptLogger.info(
    `[seed] created ${SEED_RECORDS.length} users and accounts ` +
      `(${staleCount} stale beyond 3 days, ${neverLoggedIn} never logged in)`,
  );
  scriptLogger.info(
    `[seed] log in with any userName above and password "${DEMO_PASSWORD}" — ` +
      `e.g. { "userName": "super_admin", "password": "${DEMO_PASSWORD}" }`,
  );
}

void runScript('seed', seed);
