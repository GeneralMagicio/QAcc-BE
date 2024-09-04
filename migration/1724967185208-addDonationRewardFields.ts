import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDonationRewardFields1724967185208
  implements MigrationInterface
{
  name = 'AddDonationRewardFields1724967185208';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "rewardTokenAmount" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "lockedRewardTokenAmount" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "rewardStreamStart" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "rewardStreamEnd" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "rewardStreamEnd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "rewardStreamStart"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "lockedRewardTokenAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "rewardTokenAmount"`,
    );
  }
}
