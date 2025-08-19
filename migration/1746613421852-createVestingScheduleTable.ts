import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVestingScheduleTable1746613421852
  implements MigrationInterface
{
  name = 'CreateVestingScheduleTable1746613421852';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "vesting_schedule" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "start" TIMESTAMP NOT NULL,
        "cliff" TIMESTAMP NOT NULL,
        "end" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vesting_schedule_id" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "vesting_schedule"`);
  }
}
