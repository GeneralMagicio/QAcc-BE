import { MigrationInterface, QueryRunner } from 'typeorm';

export class createGivPowerHistoricTablesProcedure1670429143091
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // power boosting
    await queryRunner.query(`
            CREATE OR REPLACE PROCEDURE PUBLIC."TAKE_POWER_BOOSTING_SNAPSHOT_HISTORY"() LANGUAGE 'sql' AS $BODY$
                WITH snapshot_entity AS (
                    DELETE FROM "power_boosting_snapshot" AS pbs
                    WHERE pbs."powerSnapshotId" IN (
                        SELECT "snapshot"."id"
                        FROM "power_snapshot" AS "snapshot", "power_round" AS "powerRound"
                        WHERE "snapshot"."roundNumber" < "powerRound"."round" - 3
                    )
                    RETURNING pbs."id", pbs."userId", pbs."projectId", pbs."powerSnapshotId", pbs."percentage"
                )
                INSERT INTO "power_boosting_snapshot_history"
                SELECT se."id", se."userId", se."projectId", se."powerSnapshotId", se."percentage"
                FROM snapshot_entity AS se
            $BODY$;
        `);

    // power balance
    await queryRunner.query(`
            CREATE OR REPLACE PROCEDURE PUBLIC."TAKE_POWER_BALANCE_SNAPSHOT_HISTORY"() LANGUAGE 'sql' AS $BODY$
                WITH snapshot_entity AS (
                    DELETE FROM "power_balance_snapshot" AS pbs
                    WHERE pbs."powerSnapshotId" IN (
                        SELECT "snapshot"."id"
                        FROM "power_snapshot" AS "snapshot", "power_round" AS "powerRound"
                        WHERE "snapshot"."roundNumber" < "powerRound"."round" - 3
                    )
                    RETURNING pbs."id", pbs."userId", pbs."balance", pbs."powerSnapshotId"
                )
                INSERT INTO "power_balance_snapshot_history"
                SELECT se."id", se."userId", se."balance", se."powerSnapshotId"
                FROM snapshot_entity AS se
            $BODY$;
        `);

    // power snapshot
    await queryRunner.query(`
            CREATE OR REPLACE PROCEDURE PUBLIC."TAKE_POWER_SNAPSHOT_HISTORY"() LANGUAGE 'sql' AS $BODY$
                WITH snapshot_entity AS (
                    DELETE FROM "power_snapshot" AS ps
                    WHERE ps."id" IN (
                        SELECT "snapshot"."id"
                        FROM "power_snapshot" AS "snapshot", "power_round" AS "powerRound"
                        WHERE "snapshot"."roundNumber" < "powerRound"."round" - 3
                    )
                    RETURNING ps."id", ps."time", ps."blockNumber", ps."roundNumber", ps."synced"
                )
                INSERT INTO "power_snapshot_history"
                SELECT se."id", se."time", se."blockNumber", se."roundNumber", se."synced"
                FROM snapshot_entity AS se
            $BODY$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS public."TAKE_POWER_BALANCE_SNAPSHOT_HISTORY"();`,
    );
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS public."TAKE_POWER_BOOSTING_SNAPSHOT_HISTORY"();`,
    );
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS public."TAKE_POWER_SNAPSHOT_HISTORY"();`,
    );
  }
}
