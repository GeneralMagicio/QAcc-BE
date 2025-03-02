import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChianAbstractionsFieldsToDonations1740949794017
  implements MigrationInterface
{
  name = 'AddChianAbstractionsFieldsToDonations1740949794017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_user_record" DROP CONSTRAINT "FK_project_user_record_qf_round"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_early_access_rounds_early_access_round" DROP CONSTRAINT "FK_project_early_access_rounds_round"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_early_access_rounds_early_access_round" DROP CONSTRAINT "FK_project_early_access_rounds_project"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_user_record_project_user_round"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_user_record_project_user_season"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_29abdbcc3e6e7090cbc8fb1a90"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_early_access_rounds_project"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_early_access_rounds_round"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_user_record" DROP COLUMN "qfRoundId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "squidRequestId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "firstTransactionHash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "isSwap" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "donation" ADD "metaData" text`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8a3ae83457d9e924776f4f9b58" ON "project_user_record" ("projectId", "userId", "seasonNumber") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ee9e53139f6a6a96be4f3b196c" ON "project_early_access_rounds_early_access_round" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1d91fc03bfd439141845ce52a" ON "project_early_access_rounds_early_access_round" ("earlyAccessRoundId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "project_early_access_rounds_early_access_round" ADD CONSTRAINT "FK_ee9e53139f6a6a96be4f3b196cb" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_early_access_rounds_early_access_round" ADD CONSTRAINT "FK_a1d91fc03bfd439141845ce52ab" FOREIGN KEY ("earlyAccessRoundId") REFERENCES "early_access_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_early_access_rounds_early_access_round" DROP CONSTRAINT "FK_a1d91fc03bfd439141845ce52ab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_early_access_rounds_early_access_round" DROP CONSTRAINT "FK_ee9e53139f6a6a96be4f3b196cb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a1d91fc03bfd439141845ce52a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ee9e53139f6a6a96be4f3b196c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8a3ae83457d9e924776f4f9b58"`,
    );
    await queryRunner.query(`ALTER TABLE "donation" DROP COLUMN "metaData"`);
    await queryRunner.query(`ALTER TABLE "donation" DROP COLUMN "isSwap"`);
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "firstTransactionHash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "squidRequestId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_user_record" ADD "qfRoundId" integer`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_project_early_access_rounds_round" ON "project_early_access_rounds_early_access_round" ("earlyAccessRoundId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_project_early_access_rounds_project" ON "project_early_access_rounds_early_access_round" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_29abdbcc3e6e7090cbc8fb1a90" ON "project_user_record" ("projectId", "userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_project_user_record_project_user_season" ON "project_user_record" ("projectId", "userId", "seasonNumber") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_project_user_record_project_user_round" ON "project_user_record" ("projectId", "userId", "qfRoundId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "project_early_access_rounds_early_access_round" ADD CONSTRAINT "FK_project_early_access_rounds_project" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_early_access_rounds_early_access_round" ADD CONSTRAINT "FK_project_early_access_rounds_round" FOREIGN KEY ("earlyAccessRoundId") REFERENCES "early_access_round"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_user_record" ADD CONSTRAINT "FK_project_user_record_qf_round" FOREIGN KEY ("qfRoundId") REFERENCES "qf_round"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
