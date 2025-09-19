import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskLinksAndHierarchy1750496000000
  implements MigrationInterface
{
  name = 'CreateTaskLinksAndHierarchy1750496000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."task_link_type_enum" AS ENUM('BLOCKS', 'IS_BLOCKED_BY', 'SPLITS_TO', 'SPLITS_FROM', 'RELATES_TO', 'DUPLICATES', 'IS_DUPLICATED_BY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "task_links" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "source_task_id" uuid NOT NULL,
        "target_task_id" uuid NOT NULL,
        "type" "public"."task_link_type_enum" NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_links_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_task_links_no_self_link" CHECK ("source_task_id" <> "target_task_id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_links" ADD CONSTRAINT "FK_task_links_project" FOREIGN KEY("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_links" ADD CONSTRAINT "FK_task_links_source_task" FOREIGN KEY("source_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_links" ADD CONSTRAINT "FK_task_links_target_task" FOREIGN KEY("target_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_task_links_unique_pair" ON "task_links" ("project_id", "source_task_id", "target_task_id", "type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_links_source" ON "task_links" ("source_task_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_links_target" ON "task_links" ("target_task_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_links_type" ON "task_links" ("type")`,
    );
    await queryRunner.query(
      `CREATE TABLE "task_hierarchy" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "parent_task_id" uuid NOT NULL,
        "child_task_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_hierarchy_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_task_hierarchy_no_self" CHECK ("parent_task_id" <> "child_task_id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_hierarchy" ADD CONSTRAINT "FK_task_hierarchy_project" FOREIGN KEY("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_hierarchy" ADD CONSTRAINT "FK_task_hierarchy_parent" FOREIGN KEY("parent_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_hierarchy" ADD CONSTRAINT "FK_task_hierarchy_child" FOREIGN KEY("child_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_task_hierarchy_unique_pair" ON "task_hierarchy" ("project_id", "parent_task_id", "child_task_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_hierarchy_parent" ON "task_hierarchy" ("parent_task_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_hierarchy_child" ON "task_hierarchy" ("child_task_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_task_hierarchy_child"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_task_hierarchy_parent"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_task_hierarchy_unique_pair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_hierarchy" DROP CONSTRAINT "FK_task_hierarchy_child"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_hierarchy" DROP CONSTRAINT "FK_task_hierarchy_parent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_hierarchy" DROP CONSTRAINT "FK_task_hierarchy_project"`,
    );
    await queryRunner.query(`DROP TABLE "task_hierarchy"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_task_links_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_task_links_target"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_task_links_source"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_task_links_unique_pair"`);
    await queryRunner.query(
      `ALTER TABLE "task_links" DROP CONSTRAINT "FK_task_links_target_task"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_links" DROP CONSTRAINT "FK_task_links_source_task"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_links" DROP CONSTRAINT "FK_task_links_project"`,
    );
    await queryRunner.query(`DROP TABLE "task_links"`);
    await queryRunner.query(`DROP TYPE "public"."task_link_type_enum"`);
  }
}
