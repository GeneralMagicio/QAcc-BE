import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReelVideoToProjectSocialMediaType1746613421849
  implements MigrationInterface
{
  name = 'AddReelVideoToProjectSocialMediaType1746613421849';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add REEL_VIDEO to the project_social_media_type_enum
    await queryRunner.query(
      `ALTER TYPE "public"."project_social_media_type_enum" ADD VALUE 'REEL_VIDEO'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type and updating all references
    // For safety, we'll leave the enum value in place during rollback
    // If rollback is absolutely necessary, it would need to be done manually
  }
}
