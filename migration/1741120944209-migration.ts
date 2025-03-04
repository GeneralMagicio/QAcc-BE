import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1741120944209 implements MigrationInterface {
  name = 'Migration1741120944209';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "qaccPoints" real NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "qaccPointsMultiplier" real NOT NULL DEFAULT '1'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "qaccPointsMultiplier"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "qaccPoints"`);
  }
}
