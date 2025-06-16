import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTwitterAndAddDob1750086594011 implements MigrationInterface {
  name = 'RemoveTwitterAndAddDob1750086594011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "dob" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "dob"`);
  }
}
