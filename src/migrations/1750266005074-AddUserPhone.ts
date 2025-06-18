import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPhone1750266005074 implements MigrationInterface {
  name = 'AddUserPhone1750266005074';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "twitter" TO "phone"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "phone" TO "twitter"`,
    );
  }
}
