import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectSnapshotEntity1750494855802
  implements MigrationInterface
{
  name = 'AddProjectSnapshotEntity1750494855802';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "project_snapshots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "snapshot_date" date NOT NULL, "total_tasks" integer NOT NULL DEFAULT '0', "completed_tasks" integer NOT NULL DEFAULT '0', "in_progress_tasks" integer NOT NULL DEFAULT '0', "todo_tasks" integer NOT NULL DEFAULT '0', "new_tasks_today" integer NOT NULL DEFAULT '0', "completed_tasks_today" integer NOT NULL DEFAULT '0', "comments_added_today" integer NOT NULL DEFAULT '0', "attachments_uploaded_today" integer NOT NULL DEFAULT '0', "completion_percentage" numeric(5,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_23ea08fb0cf71a0c346dce6a418" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_snapshots" ADD CONSTRAINT "FK_bee91be214626a3fc6f83560bae" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_snapshots" DROP CONSTRAINT "FK_bee91be214626a3fc6f83560bae"`,
    );
    await queryRunner.query(`DROP TABLE "project_snapshots"`);
  }
}
