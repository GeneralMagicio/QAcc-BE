import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeasonsTable1744677815994 implements MigrationInterface {
  name = 'AddSeasonsTable1744677815994';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_donation_swap_transaction"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8a3ae83457d9e924776f4f9b58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_user_record" RENAME COLUMN "seasonNumber" TO "seasonId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round" RENAME COLUMN "seasonNumber" TO "seasonId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "early_access_round" RENAME COLUMN "seasonNumber" TO "seasonId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" RENAME COLUMN "seasonNumber" TO "seasonId"`,
    );
    await queryRunner.query(
      `CREATE TABLE "season" ("id" SERIAL NOT NULL, "seasonNumber" integer NOT NULL, "startDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8ac0d081dbdb7ab02d166bcda9f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_transaction" DROP CONSTRAINT "UQ_squid_request_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "UQ_d0aa80d5d06d4aa31586968d788" UNIQUE ("swapTransactionId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_edfefa6089ee1693f6086a53d7" ON "project_user_record" ("projectId", "userId", "seasonId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "project_user_record" ADD CONSTRAINT "FK_6e124b5e088297849bea82a8ccc" FOREIGN KEY ("seasonId") REFERENCES "season"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round" ADD CONSTRAINT "FK_f5ee03f95a68629d1e7ce59a7e3" FOREIGN KEY ("seasonId") REFERENCES "season"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "early_access_round" ADD CONSTRAINT "FK_2f7c8f2f701e8b3959d17fabde9" FOREIGN KEY ("seasonId") REFERENCES "season"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_d0aa80d5d06d4aa31586968d788" FOREIGN KEY ("swapTransactionId") REFERENCES "swap_transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_d4e17e6132b7c89ad5679e5e6d2" FOREIGN KEY ("seasonId") REFERENCES "season"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_d4e17e6132b7c89ad5679e5e6d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_d0aa80d5d06d4aa31586968d788"`,
    );
    await queryRunner.query(
      `ALTER TABLE "early_access_round" DROP CONSTRAINT "FK_2f7c8f2f701e8b3959d17fabde9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round" DROP CONSTRAINT "FK_f5ee03f95a68629d1e7ce59a7e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_user_record" DROP CONSTRAINT "FK_6e124b5e088297849bea82a8ccc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_edfefa6089ee1693f6086a53d7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "UQ_d0aa80d5d06d4aa31586968d788"`,
    );
    await queryRunner.query(
      `ALTER TABLE "swap_transaction" ADD CONSTRAINT "UQ_squid_request_id" UNIQUE ("squidRequestId")`,
    );
    await queryRunner.query(`DROP TABLE "season"`);
    await queryRunner.query(
      `ALTER TABLE "project" RENAME COLUMN "seasonId" TO "seasonNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "early_access_round" RENAME COLUMN "seasonId" TO "seasonNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round" RENAME COLUMN "seasonId" TO "seasonNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_user_record" RENAME COLUMN "seasonId" TO "seasonNumber"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8a3ae83457d9e924776f4f9b58" ON "project_user_record" ("projectId", "userId", "seasonNumber") `,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_donation_swap_transaction" FOREIGN KEY ("swapTransactionId") REFERENCES "swap_transaction"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
