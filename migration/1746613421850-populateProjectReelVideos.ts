import { MigrationInterface, QueryRunner } from 'typeorm';

export class PopulateProjectReelVideos1746613421850
  implements MigrationInterface
{
  name = 'PopulateProjectReelVideos1746613421850';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Define the project ticker to Reel Video URL mapping
    const projectReelVideos = [
      {
        ticker: 'PACK',
        url: 'https://youtube.com/shorts/8Gk-Ly8Foac?feature=share',
      },
      {
        ticker: 'X23',
        url: 'https://youtube.com/shorts/AnKtMfnQrmU?feature=share',
      },
      {
        ticker: 'TDM',
        url: 'https://youtube.com/shorts/ZZX6NuXkJO8?feature=share',
      },
      {
        ticker: 'PRSM',
        url: 'https://youtube.com/shorts/k5qXJH-o2Z0?feature=share',
      },
      {
        ticker: 'CTZN',
        url: 'https://youtube.com/shorts/neF1zbCeImU?feature=share',
      },
      {
        ticker: 'H2DAO',
        url: 'https://youtube.com/shorts/Zgd30u7ta-A?feature=share',
      },
      {
        ticker: 'LOCK',
        url: 'https://youtube.com/shorts/WLeG91LzzVc?feature=share',
      },
      {
        ticker: 'ACHAD',
        url: 'https://youtube.com/shorts/G0-PXR7V-ro?feature=share',
      },
      {
        ticker: 'BEAST',
        url: 'https://youtube.com/shorts/Ouq2984E5F4?feature=share',
      },
      {
        ticker: 'MELS',
        url: 'https://youtube.com/shorts/KTXsNhANaDs?feature=share',
      },
    ];

    // Insert Reel Video social media entries for each project
    for (const { ticker, url } of projectReelVideos) {
      // First, get the project ID and admin user ID for the project with this ticker
      const projectResult = await queryRunner.query(
        `SELECT id, "adminUserId" 
         FROM "project" 
         WHERE "abc"->>'tokenTicker' = $1`,
        [ticker],
      );

      if (projectResult.length > 0) {
        const projectId = projectResult[0].id;
        const adminUserId = projectResult[0].adminUserId;

        // Insert the Reel Video social media entry
        await queryRunner.query(
          `INSERT INTO "project_social_media" ("type", "link", "projectId", "userId")
           VALUES ('REEL_VIDEO', $1, $2, $3)`,
          [url, projectId, adminUserId],
        );
      }
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
      'BEAST',
      'MELS',
    ];

    // Remove Reel Video social media entries for these projects
    for (const ticker of projectTickers) {
      await queryRunner.query(
        `DELETE FROM "project_social_media" 
         WHERE "type" = 'REEL_VIDEO' 
         AND "projectId" IN (
           SELECT id FROM "project" WHERE "abc"->>'tokenTicker' = $1
         )`,
        [ticker],
      );
    }
  }
}
