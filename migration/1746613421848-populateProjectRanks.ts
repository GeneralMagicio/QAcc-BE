import { MigrationInterface, QueryRunner } from 'typeorm';

export class PopulateProjectRanks1746613421848 implements MigrationInterface {
  name = 'PopulateProjectRanks1746613421848';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Define the project ticker to rank mapping
    const projectRanks = [
      { ticker: 'PACK', rank: 1 },
      { ticker: 'X23', rank: 1 },
      { ticker: 'TDM', rank: 1 },
      { ticker: 'PRSM', rank: 1 },
      { ticker: 'CTZN', rank: 1 },
      { ticker: 'H2DAO', rank: 2 },
      { ticker: 'LOCK', rank: 2 },
      { ticker: 'ACHAD', rank: 2 },
      { ticker: 'GRNDT', rank: 2 },
      { ticker: 'AKA', rank: 3 },
      { ticker: 'BEAST', rank: 3 },
      { ticker: 'MELS', rank: 3 },
    ];

    // Update each project's rank based on ticker
    for (const { ticker, rank } of projectRanks) {
      await queryRunner.query(
        `UPDATE "project" 
         SET "rank" = $1 
         WHERE "abc"->>'tokenTicker' = $2`,
        [rank, ticker],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Define the project tickers that were updated
    const projectTickers = [
      'PACK',
      'X23',
      'TDM',
      'PRSM',
      'CTZN',
      'H2DAO',
      'LOCK',
      'ACHAD',
      'GRNDT',
      'AKA',
      'BEAST',
      'MELS',
    ];

    // Reset rank to default (0) for these projects
    for (const ticker of projectTickers) {
      await queryRunner.query(
        `UPDATE "project" 
         SET "rank" = 0 
         WHERE "abc"->>'tokenTicker' = $1`,
        [ticker],
      );
    }
  }
}
