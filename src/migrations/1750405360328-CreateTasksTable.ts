import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTasksTable1750405360328 implements MigrationInterface {
  name = 'CreateTasksTable1750405360328';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_owner_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contributors" DROP CONSTRAINT "FK_project_contributors_project_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contributors" DROP CONSTRAINT "FK_project_contributors_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_projects_owner_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_projects_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_projects_createdAt"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_contributors_project_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_contributors_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_contributors_role"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_contributors_unique_user_project"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('TODO', 'IN_PROGRESS', 'DONE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'TODO', "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'MEDIUM', "dueDate" TIMESTAMP, "project_id" uuid NOT NULL, "assignee_id" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "UQ_4542dd0f38b0b4c4b8c4c4c4c4c"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."project_status_enum" RENAME TO "project_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."projects_status_enum" AS ENUM('ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" TYPE "public"."projects_status_enum" USING "status"::"text"::"public"."projects_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(`DROP TYPE "public"."project_status_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."project_role_enum" RENAME TO "project_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."project_contributors_role_enum" AS ENUM('OWNER', 'ADMIN', 'WRITE', 'READ')`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contributors" ALTER COLUMN "role" TYPE "public"."project_contributors_role_enum" USING "role"::"text"::"public"."project_contributors_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."project_role_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_b1bd2fbf5d0ef67319c91acb5cf" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_855d484825b715c545349212c7f" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contributors" ADD CONSTRAINT "FK_e73497669f0830c2e416e771806" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contributors" ADD CONSTRAINT "FK_3108a924073f38ac515524707d8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_contributors" DROP CONSTRAINT "FK_3108a924073f38ac515524707d8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contributors" DROP CONSTRAINT "FK_e73497669f0830c2e416e771806"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_855d484825b715c545349212c7f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_b1bd2fbf5d0ef67319c91acb5cf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."project_role_enum_old" AS ENUM('OWNER', 'ADMIN', 'WRITE', 'READ')`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contributors" ALTER COLUMN "role" TYPE "public"."project_role_enum_old" USING "role"::"text"::"public"."project_role_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."project_contributors_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."project_role_enum_old" RENAME TO "project_role_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."project_status_enum_old" AS ENUM('ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" TYPE "public"."project_status_enum_old" USING "status"::"text"::"public"."project_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(`DROP TYPE "public"."projects_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."project_status_enum_old" RENAME TO "project_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "UQ_4542dd0f38b0b4c4b8c4c4c4c4c" UNIQUE ("token")`,
    );
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_project_contributors_unique_user_project" ON "project_contributors" ("project_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_project_contributors_role" ON "project_contributors" ("role") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_project_contributors_user_id" ON "project_contributors" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_project_contributors_project_id" ON "project_contributors" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_projects_createdAt" ON "projects" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_projects_status" ON "projects" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_projects_owner_id" ON "projects" ("owner_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contributors" ADD CONSTRAINT "FK_project_contributors_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contributors" ADD CONSTRAINT "FK_project_contributors_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
