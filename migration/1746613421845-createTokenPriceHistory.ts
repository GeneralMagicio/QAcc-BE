import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTokenPriceHistory1746613421845
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "token_price_history" (
        "id" SERIAL NOT NULL,
        "token" text NOT NULL,
        "tokenAddress" text NOT NULL,
        "price" float NOT NULL,
        "priceUSD" float,
        "marketCap" float,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_token_price_history" PRIMARY KEY ("id")
      );
      
      CREATE UNIQUE INDEX "IDX_token_price_history_token_timestamp" 
      ON "token_price_history" ("tokenAddress", "timestamp");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_token_price_history_token_timestamp";
      DROP TABLE "token_price_history";
    `);
  }
}
