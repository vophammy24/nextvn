import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import type { db } from '../prisma/db.js';

const seedReason = 'Explicit isolated demo admin seed';
const input = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9._]+$/),
  email: z.email().trim().toLowerCase(),
  fullName: z.string().trim().min(1).max(120),
  password: z
    .string()
    .min(12)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72),
});
export type AdminDemoInput = z.infer<typeof input>;

export function readAdminDemoConfig(
  environment: NodeJS.ProcessEnv,
  args: string[],
): AdminDemoInput {
  if (environment.NODE_ENV === 'production')
    throw new Error('Demo Admin seed is disabled in production.');
  if (args.length !== 1 || args[0] !== '--confirm-demo-admin')
    throw new Error('Explicit --confirm-demo-admin is required.');
  const target = environment.ADMIN_DEMO_TARGET;
  if (target !== 'local' && target !== 'staging')
    throw new Error('Set ADMIN_DEMO_TARGET to local or staging after verifying the database.');
  let local = false;
  try {
    const url = new URL(environment.DATABASE_URL ?? '');
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error();
    local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    throw new Error('A valid PostgreSQL DATABASE_URL is required.');
  }
  if (target === 'local' && !local)
    throw new Error('The selected database is remote; local target refused.');
  const parsed = input.safeParse({
    username: environment.ADMIN_DEMO_USERNAME,
    email: environment.ADMIN_DEMO_EMAIL,
    fullName: environment.ADMIN_DEMO_FULL_NAME,
    password: environment.ADMIN_DEMO_PASSWORD,
  });
  if (!parsed.success)
    throw new Error(
      'Set ADMIN_DEMO_USERNAME, ADMIN_DEMO_EMAIL, ADMIN_DEMO_FULL_NAME and ADMIN_DEMO_PASSWORD (12+ characters, at most 72 UTF-8 bytes).',
    );
  return parsed.data;
}

export async function seedAdminDemo(database: typeof db, config: AdminDemoInput) {
  // Validate again for callers other than the CLI; never interpolate credentials into errors/logs.
  const parsed = input.safeParse(config);
  if (!parsed.success) throw new Error('Invalid demo administrator configuration.');
  const data = parsed.data;
  return database.transaction(async (tx) => {
    // Same lock as the first-administrator bootstrap, so the two entrypoints cannot race.
    await tx.query(
      database.raw.sql`SELECT pg_advisory_xact_lock(20261022)`
        .returnsRow({ pg_advisory_xact_lock: 'pg/text@1' })
        .build(),
    );
    const users = tx.orm.public.User;
    const byUsername = await users.where({ username: data.username }).first();
    const byEmail = await users.where({ email: data.email }).first();
    if (byUsername || byEmail) {
      if (
        !byUsername ||
        !byEmail ||
        byUsername.id !== byEmail.id ||
        byUsername.platformRole !== 'ADMIN' ||
        byUsername.status !== 'ACTIVE'
      )
        throw new Error('Account identity collision; no existing account was changed.');
      const membership = await tx.orm.public.BusinessMember.where({
        userId: byUsername.id,
      }).first();
      const marker = await tx.orm.public.AdminAuditEvent.where({
        actorId: byUsername.id,
        action: 'ADMIN_BOOTSTRAPPED',
        reason: seedReason,
      }).first();
      if (membership || !marker)
        throw new Error(
          'Existing account is not an isolated demo administrator created by this seed.',
        );
      return { status: 'preserved' as const, userId: byUsername.id, username: byUsername.username };
    }
    if (await users.where({ platformRole: 'ADMIN' }).select('id').first())
      throw new Error(
        'An administrator already exists. Use the existing operator account; no additional admin was created.',
      );
    const userId = randomUUID();
    await users.create({
      id: userId,
      username: data.username,
      email: data.email,
      fullName: data.fullName,
      passwordHash: await bcrypt.hash(data.password, 12),
      platformRole: 'ADMIN',
      status: 'ACTIVE',
    });
    await tx.orm.public.AdminAuditEvent.create({
      id: randomUUID(),
      actorId: userId,
      action: 'ADMIN_BOOTSTRAPPED',
      entityType: 'User',
      entityId: userId,
      previousStatus: null,
      newStatus: 'ADMIN',
      reason: seedReason,
      correlationId: randomUUID(),
    });
    return { status: 'created' as const, userId, username: data.username };
  });
}
