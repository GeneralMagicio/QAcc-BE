import { UserResolver } from './userResolver';
import { ProjectResolver } from './projectResolver';
import { MeResolver } from '../user/MeResolver';
import { UploadResolver } from './uploadResolver';
import { CategoryResolver } from './categoryResolver';
import { DonationResolver } from './donationResolver';
import { ReactionResolver } from './reactionResolver';
import { StatusReasonResolver } from './statusReasonResolver';
import { ProjectVerificationFormResolver } from './projectVerificationFormResolver';
import { SocialProfilesResolver } from './socialProfilesResolver';
import { CampaignResolver } from './campaignResolver';
import { ChainvineResolver } from './chainvineResolver';
import { QfRoundResolver } from './qfRoundResolver';
import { QfRoundHistoryResolver } from './qfRoundHistoryResolver';
import { DraftDonationResolver } from './draftDonationResolver';
import { OnboardingFormResolver } from './onboardingFormResolver';
import { RoundsResolver } from './roundsResolver';
import { QAccResolver } from './qAccResolver';
import { QaccPointsHistoryResolver } from './qaccPointsHistoryResolver';
import { TokenPriceResolver } from './tokenPriceResolver';
import { VestingScheduleResolver } from './vestingScheduleResolver';
import { TokenHolderResolver } from './tokenHolderResolver';

// eslint-disable-next-line @typescript-eslint/ban-types
export const getResolvers = (): Function[] => {
  return [
    UserResolver,
    ProjectResolver,
    ChainvineResolver,
    StatusReasonResolver,

    MeResolver,
    UploadResolver,
    CategoryResolver,
    DonationResolver,
    DraftDonationResolver,
    ReactionResolver,
    ProjectVerificationFormResolver,
    SocialProfilesResolver,

    CampaignResolver,
    QfRoundResolver,
    QfRoundHistoryResolver,

    OnboardingFormResolver,
    RoundsResolver,

    QAccResolver,
    QaccPointsHistoryResolver,
    TokenPriceResolver,
    VestingScheduleResolver,
    TokenHolderResolver,
  ];
};
