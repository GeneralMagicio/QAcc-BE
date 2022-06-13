import { SocialNetworkOauth2AdapterInterface } from './oauth2/SocialNetworkOauth2AdapterInterface';
import { DiscordAdapter } from './oauth2/discordAdapter';
import { SOCIAL_NETWORKS } from '../entities/socialProfile';
import { errorMessages } from '../utils/errorMessages';
import { GoogleAdapter } from './oauth2/googleAdapter';

const discordAdapter = new DiscordAdapter();
const googleAdapter = new GoogleAdapter();
export const getSocialNetworkAdapter = (
  socialNetwork: string,
): SocialNetworkOauth2AdapterInterface => {
  switch (socialNetwork) {
    case SOCIAL_NETWORKS.DISCORD:
      return discordAdapter;
    case SOCIAL_NETWORKS.GOOGLE:
      return googleAdapter;
    default:
      throw new Error(errorMessages.INVALID_SOCIAL_NETWORK);
  }
};
