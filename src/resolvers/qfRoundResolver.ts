import { Arg, Field, ObjectType, Query, Resolver } from 'type-graphql';
import { Repository } from 'typeorm';

import { User } from '../entities/user';
import {
  findActiveQfRound,
  findAllQfRounds,
  getProjectDonationsSqrtRootSum,
  getQfRoundTotalProjectsDonationsSum,
} from '../repositories/qfRoundRepository';
import { QfRound } from '../entities/qfRound';

@ObjectType()
export class ExpectedMatchingResponse {
  @Field()
  projectDonationsSqrtRootSum: number;

  @Field()
  allProjectsSum: number;

  @Field()
  matchingPool: number;
}

@Resolver(of => User)
export class QfRoundResolver {
  @Query(returns => [QfRound], { nullable: true })
  async qfRounds() {
    return findAllQfRounds();
  }

  // This will be the formula data separated by parts so frontend
  // can calculate the estimated matchin added per new donation
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
}