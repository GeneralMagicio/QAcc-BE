import {
  Arg,
  Args,
  ArgsType,
  Field,
  InputType,
  Int,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import { Service } from 'typedi';
import { Max, Min } from 'class-validator';
import { User } from '../entities/user';
import {
  findActiveQfRound,
  findQfRounds,
  findArchivedQfRounds,
  findQfRoundBySlug,
  getProjectDonationsSqrtRootSum,
  getQfRoundTotalProjectsDonationsSum,
  QFArchivedRounds,
  QfArchivedRoundsSortType,
} from '../repositories/qfRoundRepository';
import { QfRound } from '../entities/qfRound';
import { OrderDirection } from './projectResolver';
import { getGitcoinAdapter } from '../adapters/adaptersFactory';
import { logger } from '../utils/logger';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { UserQfRoundModelScore } from '../entities/userQfRoundModelScore';
import { findUserByWalletAddress } from '../repositories/userRepository';

@ObjectType()
export class QfRoundStatsResponse {
  @Field()
  uniqueDonors: number;

  @Field()
  allDonationsUsdValue: number;

  @Field()
  matchingPool: number;

  @Field()
  qfRound: QfRound;
}

@ObjectType()
export class ExpectedMatchingResponse {
  @Field()
  projectDonationsSqrtRootSum: number;

  @Field()
  allProjectsSum: number;

  @Field()
  matchingPool: number;
}

@InputType()
export class QfArchivedRoundsOrderBy {
  @Field(_type => QfArchivedRoundsSortType)
  field: QfArchivedRoundsSortType;

  @Field(_type => OrderDirection)
  direction: OrderDirection;
}

@Service()
@ArgsType()
class QfArchivedRoundsArgs {
  @Field(_type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number;

  @Field(_type => Int, { defaultValue: 10 })
  @Min(0)
  @Max(50)
  limit: number;

  @Field(_type => QfArchivedRoundsOrderBy, {
    defaultValue: {
      field: QfArchivedRoundsSortType.beginDate,
      direction: OrderDirection.DESC,
    },
  })
  orderBy: QfArchivedRoundsOrderBy;
}

@Service()
@ArgsType()
export class QfRoundsArgs {
  @Field(_type => String, { nullable: true })
  slug?: string;

  @Field(_type => Boolean, { nullable: true })
  activeOnly?: boolean;
}

@Resolver(_of => User)
export class QfRoundResolver {
  @Query(_returns => [QfRound], { nullable: true })
  async qfRounds(
    @Args()
    { slug, activeOnly }: QfRoundsArgs,
  ) {
    return findQfRounds({ slug, activeOnly });
  }

  @Query(_returns => [QFArchivedRounds], { nullable: true })
  async qfArchivedRounds(
    @Args()
    { limit, skip, orderBy }: QfArchivedRoundsArgs,
  ): Promise<QFArchivedRounds[] | null> {
    return findArchivedQfRounds(limit, skip, orderBy);
  }

  @Query(_return => Number, { nullable: true })
  async scoreUserAddress(
    @Arg('address') address: string,
  ): Promise<number | undefined> {
    try {
      const user = await findUserByWalletAddress(address.toLowerCase());
      const activeQfRound = await findActiveQfRound();
      if (!user || !activeQfRound) return;

      const userScore = await getGitcoinAdapter().getUserAnalysisScore(
        address.toLowerCase(),
      );
      const userQfRoundScore = UserQfRoundModelScore.create({
        userId: user.id,
        qfRoundId: activeQfRound.id,
        score: userScore,
      });

      await userQfRoundScore.save();
      return userScore;
    } catch (e) {
      logger.error('scoreUserAddress error', e);
      throw new Error(
        i18n.__(translationErrorMessagesKeys.GITCOIN_ERROR_FETCHING_DATA),
      );
    }
  }

  @Query(_return => Number, { nullable: true })
  async fetchUserMBDScore(
    @Arg('address') address: string,
  ): Promise<{ score: number | undefined } | undefined> {
    try {
      const user = await findUserByWalletAddress(address.toLowerCase());
      const activeQfRound = await findActiveQfRound();
      if (!user && !activeQfRound) return;

      const userQfRoundScore = await UserQfRoundModelScore.findOne({
        where: {
          userId: user?.id,
          qfRoundId: activeQfRound!.id,
        },
      });

      return { score: userQfRoundScore?.score };
    } catch (e) {
      logger.error('fetchUserModelScore error', e);
      throw new Error(
        i18n.__(translationErrorMessagesKeys.GITCOIN_ERROR_FETCHING_DATA),
      );
    }
  }

  // This will be the formula data separated by parts so frontend
  // can calculate the estimated matching added per new donation
  @Query(() => ExpectedMatchingResponse, { nullable: true })
  async expectedMatching(
    @Arg('projectId') projectId: number,
  ): Promise<ExpectedMatchingResponse | null> {
    const activeQfRound = await findActiveQfRound();
    if (!activeQfRound) {
      return null;
    }

    const projectDonationsSqrtRootSum = await getProjectDonationsSqrtRootSum(
      projectId,
      activeQfRound.id,
    );

    const allProjectsSum = await getQfRoundTotalProjectsDonationsSum(
      activeQfRound.id,
    );

    const matchingPool = activeQfRound.allocatedFund;

    return {
      projectDonationsSqrtRootSum: projectDonationsSqrtRootSum.sqrtRootSum,
      allProjectsSum: allProjectsSum.sum,
      matchingPool,
    };
  }
  @Query(() => QfRoundStatsResponse, { nullable: true })
  async qfRoundStats(
    @Arg('slug') slug: string,
  ): Promise<QfRoundStatsResponse | null> {
    const qfRound = await findQfRoundBySlug(slug);
    if (!qfRound) {
      return null;
    }
    const { totalDonationsSum, contributorsCount } =
      await getQfRoundTotalProjectsDonationsSum(qfRound.id);
    return {
      uniqueDonors: contributorsCount,
      allDonationsUsdValue: totalDonationsSum,
      matchingPool: qfRound.allocatedFund,
      qfRound,
    };
  }
}
