import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function repairFailedMigration() {
  const migrationName = "003_marketplace_core";

  try {
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT
        "id",
        "migration_name",
        "finished_at",
        "rolled_back_at"
      FROM "_prisma_migrations"
      WHERE "migration_name" = $1
      ORDER BY "started_at" DESC
      LIMIT 1
      `,
      migrationName
    );

    if (!rows.length) {
      console.log(`Migration ${migrationName} not found. Nothing to repair.`);
      return;
    }

    const migration = rows[0];

    if (migration.finished_at) {
      console.log(
        `Migration ${migrationName} is already successful. Nothing to repair.`
      );
      return;
    }

    if (migration.rolled_back_at) {
      console.log(
        `Migration ${migrationName} is already marked as rolled back.`
      );
      return;
    }

    await prisma.$executeRawUnsafe(
      `
      UPDATE "_prisma_migrations"
      SET "rolled_back_at" = CURRENT_TIMESTAMP
      WHERE "id" = $1
        AND "finished_at" IS NULL
        AND "rolled_back_at" IS NULL
      `,
      migration.id
    );

    console.log(
      `Migration ${migrationName} was marked as rolled back successfully.`
    );
  } catch (error) {
    console.error("Migration repair failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

repairFailedMigration();
