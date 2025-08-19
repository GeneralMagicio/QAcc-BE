import { MigrationInterface, QueryRunner } from 'typeorm';

export class PopulateVestingSchedules1746613421853
  implements MigrationInterface
{
  name = 'PopulateVestingSchedules1746613421853';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Define the vesting schedule data
    const vestingSchedules = [
      {
        name: 'Season 1 projects',
        start: '2024-10-29',
        cliff: '2025-10-29',
        end: '2026-10-29',
      },
      {
        name: 'Season 2 projects',
        start: '2025-04-11',
        cliff: '2026-04-11',
        end: '2027-04-11',
      },
      {
        name: 'R1 Season 1 buyers',
        start: '2024-12-20',
        cliff: '2025-06-20',
        end: '2025-12-20',
      },
      {
        name: 'R2 Season 1 buyers',
        start: '2025-05-13',
        cliff: '2025-10-13',
        end: '2026-03-13',
      },
      {
        name: 'R2 Season 2 buyers',
        start: '2025-05-13',
        cliff: '2025-11-13',
        end: '2026-05-13',
      },
    ];

    // Insert each vesting schedule
    for (const schedule of vestingSchedules) {
      await queryRunner.query(
        `INSERT INTO "vesting_schedule" ("name", "start", "cliff", "end")
         VALUES ($1, $2, $3, $4)`,
        [schedule.name, schedule.start, schedule.cliff, schedule.end],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Define the schedule names that were inserted
    const scheduleNames = [
      'Season 1 projects',
      'Season 2 projects',
      'R1 Season 1 buyers',
      'R2 Season 1 buyers',
      'R2 Season 2 buyers',
    ];

    // Remove the inserted vesting schedules
    for (const name of scheduleNames) {
      await queryRunner.query(
        `DELETE FROM "vesting_schedule" WHERE "name" = $1`,
        [name],
      );
    }
  }
}
