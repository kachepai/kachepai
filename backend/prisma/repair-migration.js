import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function repairFailedMigration() {
  const migrationName = "003_marketplace_core";

  try {
    const result = await prisma.$executeRawUnsafe(
      `
      UPDATE "_prisma_migrations"
      SET "rolled_back_at" = CURRENT_TIMESTAMP
      WHERE "migration_name" = $1
        AND "finished_at" IS NULL
        AND "rolled_back_at" IS NULL
      `,
      migrationName
    );

    console.log(
      `Migration ${migrationName}: ${result} failed record(s) marked as rolled back.`
    );
  } catch (error) {
    console.error("Migration repair failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

repairFailedMigration();
