import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectContributorsTable1750278808374
  implements MigrationInterface
{
  name = 'CreateProjectContributorsTable1750278808374';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for project role
    await queryRunner.query(
      `CREATE TYPE "public"."project_role_enum" AS ENUM('OWNER', 'ADMIN', 'WRITE', 'READ')`,
    );

    // Create project_contributors table
    await queryRunner.query(
      `CREATE TABLE "project_contributors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "role" "public"."project_role_enum" NOT NULL,
        "project_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_contributors_id" PRIMARY KEY ("id")
      )`,
    );

    // Add foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "project_contributors" ADD CONSTRAINT "FK_project_contributors_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contributors" ADD CONSTRAINT "FK_project_contributors_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Add indexes for better performance
    await queryRunner.query(
      `CREATE INDEX "IDX_project_contributors_project_id" ON "project_contributors" ("project_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_project_contributors_user_id" ON "project_contributors" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_project_contributors_role" ON "project_contributors" ("role")`,
    );

    // Add unique constraint to prevent duplicate user-project combinations
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_project_contributors_unique_user_project" ON "project_contributors" ("user_id", "project_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop unique constraint
    await queryRunner.query(
      `DROP INDEX "IDX_project_contributors_unique_user_project"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_project_contributors_role"`);
    await queryRunner.query(`DROP INDEX "IDX_project_contributors_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_project_contributors_project_id"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "project_contributors" DROP CONSTRAINT "FK_project_contributors_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contributors" DROP CONSTRAINT "FK_project_contributors_project_id"`,
    );

    // Drop project_contributors table
    await queryRunner.query(`DROP TABLE "project_contributors"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "public"."project_role_enum"`);
  }
}
