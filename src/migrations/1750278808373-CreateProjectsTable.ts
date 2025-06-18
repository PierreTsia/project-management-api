import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectsTable1750278808373 implements MigrationInterface {
  name = 'CreateProjectsTable1750278808373';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for project status
    await queryRunner.query(
      `CREATE TYPE "public"."project_status_enum" AS ENUM('ACTIVE', 'ARCHIVED')`,
    );

    // Create projects table
    await queryRunner.query(
      `CREATE TABLE "projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "status" "public"."project_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "owner_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects_id" PRIMARY KEY ("id")
      )`,
    );

    // Add foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Add indexes for better performance
    await queryRunner.query(
      `CREATE INDEX "IDX_projects_owner_id" ON "projects" ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_projects_status" ON "projects" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_projects_created_at" ON "projects" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_projects_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_status"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_owner_id"`);

    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_owner_id"`,
    );

    // Drop projects table
    await queryRunner.query(`DROP TABLE "projects"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "public"."project_status_enum"`);
  }
}
