import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class createSnashotHistoricTables1670422136574
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // power snapshot
    await queryRunner.createTable(
      new Table({
        name: 'power_snapshot_history',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: false, // NO auto increment
          },
          {
            name: 'time',
            type: 'timestamp without time zone',
            isNullable: false,
          },
          {
            name: 'blockNumber',
            type: 'int',
            isNullable: true,
            isUnique: false,
          },
          {
            name: 'roundNumber',
            type: 'int',
            isNullable: true,
            isUnique: false,
          },
          {
            name: 'synced',
            type: 'boolean',
            isNullable: false,
            isUnique: false,
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp without time zone',
            isNullable: false,
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // power boosting
    await queryRunner.createTable(
      new Table({
        name: 'power_boosting_snapshot_history',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: false, // NO auto increment
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: false,
            isUnique: false,
          },
          {
            name: 'projectId',
            type: 'int',
            isNullable: false,
            isUnique: false,
          },
          {
            name: 'powerSnapshotId',
            type: 'int',
            isNullable: false,
            isUnique: false,
          },
          {
            name: 'percentage',
            type: 'double precision',
            isNullable: false,
            isUnique: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp without time zone',
            isNullable: false,
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'power_boosting_snapshot_history',
      new TableForeignKey({
        columnNames: ['powerSnapshotId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'power_snapshot_history',
      }),
    );

    // power balance
    await queryRunner.createTable(
      new Table({
        name: 'power_balance_snapshot_history',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: false, // NO auto increment
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: false,
            isUnique: false,
          },
          {
            name: 'powerSnapshotId',
            type: 'int',
            isNullable: false,
            isUnique: false,
          },
          {
            name: 'balance',
            type: 'double precision',
            isNullable: false,
            isUnique: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp without time zone',
            isNullable: false,
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'power_balance_snapshot_history',
      new TableForeignKey({
        columnNames: ['powerSnapshotId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'power_snapshot_history',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "power_balance_snapshot_history"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "power_boosting_snapshot_history"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "power_snapshot_history"`);
  }
}
