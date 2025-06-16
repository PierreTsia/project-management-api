import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTwitter1750085271121 implements MigrationInterface {
  name = 'AddUserTwitter1750085271121';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "twitter" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "twitter"`);
  }
}
