import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1750000000000 implements MigrationInterface {
  name = 'CreateInitialSchema1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table with only base columns (before any incremental migrations)
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "provider" character varying,
        "providerId" character varying,
        "password" character varying,
        "name" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "emailConfirmationToken" character varying,
        "isEmailConfirmed" boolean NOT NULL DEFAULT false,
        "passwordResetExpires" TIMESTAMP,
        "passwordResetToken" character varying,
        "emailConfirmationExpires" TIMESTAMP,
        "avatarUrl" character varying NOT NULL DEFAULT 'https://api.dicebear.com/7.x/identicon/svg?seed=default',
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    // Create refresh_tokens table
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" character varying NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "revokedAt" TIMESTAMP,
        "userId" uuid,
        CONSTRAINT "UQ_4542dd0f38b0b4c4b8c4c4c4c4c" UNIQUE ("token"),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ADD CONSTRAINT "FK_refresh_tokens_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user"
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
