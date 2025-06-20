import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttachmentTable1750438364556 implements MigrationInterface {
  name = 'CreateAttachmentTable1750438364556';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."attachments_entitytype_enum" AS ENUM('PROJECT', 'TASK')`,
    );
    await queryRunner.query(
      `CREATE TABLE "attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "filename" character varying NOT NULL, "fileType" character varying NOT NULL, "fileSize" integer NOT NULL, "cloudinaryUrl" character varying NOT NULL, "cloudinaryPublicId" character varying NOT NULL, "entityType" "public"."attachments_entitytype_enum" NOT NULL, "entityId" character varying NOT NULL, "uploadedById" uuid NOT NULL, "uploadedAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5e1f050bcff31e3084a1d662412" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "attachments" ADD CONSTRAINT "FK_a436b9dc8304f58060e905eb705" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "attachments" DROP CONSTRAINT "FK_a436b9dc8304f58060e905eb705"`,
    );
    await queryRunner.query(`DROP TABLE "attachments"`);
    await queryRunner.query(`DROP TYPE "public"."attachments_entitytype_enum"`);
  }
}
