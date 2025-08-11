import { registerEnumType } from 'type-graphql';

export enum ProjectSocialMediaType {
  FACEBOOK = 'FACEBOOK',
  X = 'X',
  INSTAGRAM = 'INSTAGRAM',
  YOUTUBE = 'YOUTUBE',
  REEL_VIDEO = 'REEL_VIDEO',
  LINKEDIN = 'LINKEDIN',
  REDDIT = 'REDDIT',
  DISCORD = 'DISCORD',
  FARCASTER = 'FARCASTER',
  LENS = 'LENS',
  WEBSITE = 'WEBSITE',
  TELEGRAM = 'TELEGRAM',
  GITHUB = 'GITHUB',
}

registerEnumType(ProjectSocialMediaType, {
  name: 'ProjectSocialMediaType',
  description: 'The social media platform types',
});
