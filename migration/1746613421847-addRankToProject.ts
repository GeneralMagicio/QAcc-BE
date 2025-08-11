import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRankToProject1746613421847 implements MigrationInterface {
  name = 'AddRankToProject1746613421847';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD "rank" real DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "rank"`);
  }
}
