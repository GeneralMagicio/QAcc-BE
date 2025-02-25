import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1740508775451 implements MigrationInterface {
    name = 'Migration1740508775451'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" ADD "hasEARound" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "hasEARound"`);
    }

}
