import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTokenHolderTable1746613421854 implements MigrationInterface {
  name = 'CreateTokenHolderTable1746613421854';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "token_holder" (
        "id" SERIAL NOT NULL,
        "projectName" character varying NOT NULL,
        "address" character varying NOT NULL,
        "tag" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_token_holder_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_token_holder_address" ON "token_holder" ("address")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_token_holder_address"`);
    await queryRunner.query(`DROP TABLE "token_holder"`);
  }
}
