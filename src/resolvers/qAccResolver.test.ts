import moment from 'moment';
import axios, { AxiosResponse } from 'axios';
import sinon from 'sinon';
import { ExecutionResult } from 'graphql';
import { assert } from 'chai';
import {
  createDonationData,
  createProjectData,
  generateEARoundNumber,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveDonationDirectlyToDb,
  saveEARoundDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import { Donation, DONATION_STATUS } from '../entities/donation';
import {
  ProjectUserRecordAmounts,
  updateOrCreateProjectUserRecord,
} from '../repositories/projectUserRecordRepository';
import {
  projectUserDonationCap,
  projectUserTotalDonationAmounts,
} from '../../test/graphqlQueries';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
import { EarlyAccessRound } from '../entities/earlyAccessRound';

describe(
  'projectUserTotalDonationAmount() test cases',
  projectUserTotalDonationAmountTestCases,
);

describe(
  'projectUserDonationCap() test cases',
  projectUserDonationCapTestCases,
);

function projectUserTotalDonationAmountTestCases() {
  it('should return total donation amount of a user for a project', async () => {
    it('should return total donation amount of a user for a project', async () => {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      const project = await saveProjectDirectlyToDb(createProjectData());

      const ea1 = await saveEARoundDirectlyToDb({
        roundNumber: generateEARoundNumber(),
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-09-05'),
      });
      const ea2 = await saveEARoundDirectlyToDb({
        roundNumber: generateEARoundNumber(),
        startDate: new Date('2024-09-06'),
        endDate: new Date('2024-09-10'),
      });

      const qfRoundNumber = generateEARoundNumber();
      const qfRound = await QfRound.create({
        isActive: true,
        name: 'test qf ',
        allocatedFund: 100,
        minimumPassportScore: 8,
        slug: 'QF - 2024-09-10 - ' + qfRoundNumber,
        roundNumber: qfRoundNumber,
        beginDate: moment('2024-09-10').add(1, 'days').toDate(),
        endDate: moment('2024-09-10').add(10, 'days').toDate(),
      }).save();

      const ea1DonationAmount = 100;
      const ea2DonationAmount = 200;
      const qfDonationAmount = 400;

      await saveDonationDirectlyToDb(
        {
          ...createDonationData(),
          amount: ea1DonationAmount,
          status: DONATION_STATUS.VERIFIED,
          earlyAccessRoundId: ea1.id,
        },
        user.id,
        project.id,
      );
      await saveDonationDirectlyToDb(
        {
          ...createDonationData(),
          amount: ea2DonationAmount,
          status: DONATION_STATUS.VERIFIED,
          earlyAccessRoundId: ea2.id,
        },
        user.id,
        project.id,
      );
      await saveDonationDirectlyToDb(
        {
          ...createDonationData(),
          amount: qfDonationAmount,
          status: DONATION_STATUS.VERIFIED,
          qfRoundId: qfRound.id,
        },
        user.id,
        project.id,
      );
      await updateOrCreateProjectUserRecord({
        projectId: project.id,
        userId: user.id,
      });

      const result: AxiosResponse<
        ExecutionResult<{
          projectUserTotalDonationAmounts: ProjectUserRecordAmounts;
        }>
      > = await axios.post(graphqlUrl, {
        query: projectUserTotalDonationAmounts,
        variables: {
          projectId: project.id,
          userId: user.id,
        },
      });

      assert.isOk(result.data);
      assert.deepEqual(result.data.data?.projectUserTotalDonationAmounts, {
        eaTotalDonationAmount: ea1DonationAmount + ea2DonationAmount,
        qfTotalDonationAmount: qfDonationAmount,
        totalDonationAmount:
          ea1DonationAmount + ea2DonationAmount + qfDonationAmount,
      });
    });
  });
}

function projectUserDonationCapTestCases() {
  let project;
  let user;
  let accessToken;
  let earlyAccessRounds: EarlyAccessRound[] = [];
  let qfRound1: QfRound;

  beforeEach(async () => {
    project = await saveProjectDirectlyToDb(createProjectData());

    user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    accessToken = await generateTestAccessToken(user.id);

    earlyAccessRounds = await EarlyAccessRound.save(
      EarlyAccessRound.create([
        {
          roundNumber: generateEARoundNumber(),
          startDate: new Date('2000-01-01'),
          endDate: new Date('2000-01-03'),
          roundUSDCapPerProject: 1000,
          roundUSDCapPerUserPerProject: 100,
          tokenPrice: 0.1,
        },
        {
          roundNumber: generateEARoundNumber(),
          startDate: new Date('2000-01-04'),
          endDate: new Date('2000-01-06'),
          roundUSDCapPerProject: 1000,
          roundUSDCapPerUserPerProject: 100,
          tokenPrice: 0.2,
        },
        {
          roundNumber: generateEARoundNumber(),
          startDate: new Date('2000-01-07'),
          endDate: new Date('2000-01-09'),
          roundUSDCapPerProject: 1000,
          roundUSDCapPerUserPerProject: 100,
          tokenPrice: 0.3,
        },
        {
          roundNumber: generateEARoundNumber(),
          startDate: new Date('2000-01-10'),
          endDate: new Date('2000-01-12'),
          roundUSDCapPerProject: 2000,
          roundUSDCapPerUserPerProject: 200,
          tokenPrice: 0.4,
        },
      ]),
    );

    qfRound1 = await QfRound.create({
      roundNumber: 1,
      isActive: true,
      name: new Date().toString() + ' - 1',
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString() + ' - 1',
      beginDate: new Date('2001-01-14'),
      endDate: new Date('2001-01-16'),
      roundUSDCapPerProject: 10000,
      roundUSDCapPerUserPerProject: 2500,
      tokenPrice: 0.5,
    }).save();
  });
  afterEach(async () => {
    // Clean up the database after each test
    await ProjectRoundRecord.delete({});
    await Donation.delete({ projectId: project.id });
    await EarlyAccessRound.delete({});
    await QfRound.delete(qfRound1.id);

    sinon.restore();
  });

  it('should return correct value for single early access round', async () => {
    sinon.useFakeTimers({
      now: earlyAccessRounds[0].startDate.getTime(),
    });

    const result: AxiosResponse<
      ExecutionResult<{
        projectUserDonationCap: number;
      }>
    > = await axios.post(
      graphqlUrl,
      {
        query: projectUserDonationCap,
        variables: {
          projectId: project.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const firstEarlyAccessRound = earlyAccessRounds[0] as EarlyAccessRound;
    assert.isOk(result.data);
    assert.equal(
      result.data.data?.projectUserDonationCap,
      firstEarlyAccessRound.roundUSDCapPerUserPerProject! /
        firstEarlyAccessRound.tokenPrice!,
    );
  });
}
