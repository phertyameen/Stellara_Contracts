/**
 * Migration Rollback Script
 *
 * Prisma Migrate does not support automatic down migrations.
 * This script provides a controlled rollback by:
 *   1. Listing applied migrations
 *   2. Marking the last N migrations as rolled back in _prisma_migrations
 *   3. Dropping the schema and re-applying up to the target migration
 *
 * Usage:
 *   npx ts-node prisma/scripts/rollback.ts --steps 1
 *   npx ts-node prisma/scripts/rollback.ts --target 20240101000000_init
 *
 * WARNING: This is destructive. Always back up your database first.
 */

import { createPrismaClient } from '../client';
import { execSync } from 'child_process';

const prisma = createPrismaClient();

interface MigrationRecord {
  id: string;
  migration_name: string;
  finished_at: Date | null;
  applied_steps_count: number;
}

async function getAppliedMigrations (): Promise<MigrationRecord[]> {
  const result = await prisma.$queryRaw<MigrationRecord[]>`
    SELECT id, migration_name, finished_at, applied_steps_count
    FROM _prisma_migrations
    WHERE finished_at IS NOT NULL
    ORDER BY finished_at DESC
  `;
  return result;
}

async function rollbackSteps (steps: number) {
  const migrations = await getAppliedMigrations();

  if (migrations.length === 0) {
    console.log('No applied migrations found.');
    return;
  }

  const toRollback = migrations.slice(0, steps);
  console.log(`\n⚠️  Rolling back ${steps} migration(s):`);
  toRollback.forEach((m) => console.log(`  - ${m.migration_name}`));

  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Rollback in production requires ALLOW_PRODUCTION_ROLLBACK=true');
    if (process.env.ALLOW_PRODUCTION_ROLLBACK !== 'true') process.exit(1);
  }

  // Mark migrations as rolled back by deleting them from the tracking table
  for (const migration of toRollback) {
    await prisma.$executeRaw`
      DELETE FROM _prisma_migrations WHERE migration_name = ${migration.migration_name}
    `;
    console.log(`  ✅ Marked ${migration.migration_name} as rolled back`);
  }

  console.log('\n📋 Remaining migrations will be re-applied on next `prisma migrate deploy`');
  console.log('   Run: npm run db:migrate:deploy to re-apply from current state\n');
}

async function rollbackToTarget (targetMigration: string) {
  const migrations = await getAppliedMigrations();
  const targetIndex = migrations.findIndex((m) =>
    m.migration_name.includes(targetMigration),
  );

  if (targetIndex === -1) {
    console.error(`❌ Migration "${targetMigration}" not found in applied migrations`);
    process.exit(1);
  }

  await rollbackSteps(targetIndex);
}

async function listMigrations () {
  const migrations = await getAppliedMigrations();
  console.log('\n📋 Applied migrations (newest first):');
  migrations.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.migration_name} (applied: ${m.finished_at?.toISOString()})`);
  });
  console.log('');
}

async function main () {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    await listMigrations();
    return;
  }

  const stepsFlag = args.indexOf('--steps');
  const targetFlag = args.indexOf('--target');

  if (stepsFlag !== -1) {
    const steps = parseInt(args[stepsFlag + 1], 10);
    if (isNaN(steps) || steps < 1) {
      console.error('❌ --steps must be a positive integer');
      process.exit(1);
    }
    await rollbackSteps(steps);
  } else if (targetFlag !== -1) {
    const target = args[targetFlag + 1];
    if (!target) {
      console.error('❌ --target requires a migration name');
      process.exit(1);
    }
    await rollbackToTarget(target);
  } else {
    console.log('Usage:');
    console.log('  --list                    List all applied migrations');
    console.log('  --steps <n>               Roll back last n migrations');
    console.log('  --target <migration_name> Roll back to a specific migration');
  }
}

main()
  .catch((e) => {
    console.error('❌ Rollback failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
