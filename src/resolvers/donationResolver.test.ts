import { assert } from 'chai';
import axios, { AxiosResponse } from 'axios';
import { In, Not } from 'typeorm';
import sinon from 'sinon';
import { ExecutionResult } from 'graphql';
import qAccService from '../services/qAccService';
import {
  generateTestAccessToken,
  graphqlUrl,
  SEED_DATA,
  DONATION_SEED_DATA,
  saveProjectDirectlyToDb,
  createProjectData,
  generateRandomEvmTxHash,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  createDonationData,
  saveUserDirectlyToDb,
  generateUserIdLessAccessToken,
  generateRandomSolanaAddress,
  generateRandomSolanaTxHash,
  deleteProjectDirectlyFromDb,
  createProjectAbcData,
  generateEARoundNumber,
} from '../../test/testUtils';
import { errorMessages } from '../utils/errorMessages';
import { Donation, DONATION_STATUS } from '../entities/donation';
import {
  fetchDonationsByUserIdQuery,
  fetchDonationsByDonorQuery,
  fetchDonationsByProjectIdQuery,
  fetchAllDonationsQuery,
  donationsToWallets,
  donationsFromWallets,
  createDonationMutation,
  fetchTotalDonationsUsdAmount,
  fetchTotalDonors,
  fetchTotalDonationsPerCategoryPerDate,
  fetchRecentDonations,
  fetchTotalDonationsNumberPerDateRange,
  doesDonatedToProjectInQfRoundQuery,
  fetchNewDonorsCount,
  fetchNewDonorsDonationTotalUsd,
  fetchDonationMetricsQuery,
} from '../../test/graphqlQueries';
import { NETWORK_IDS, QACC_NETWORK_ID } from '../provider';
import { User } from '../entities/user';
import { Organization, ORGANIZATION_LABELS } from '../entities/organization';
import { ProjStatus, ReviewStatus } from '../entities/project';
import { Token } from '../entities/token';
import { generateRandomString } from '../utils/utils';
import {
  abcLauncherMockAdapter,
  getChainvineAdapter,
} from '../adapters/adaptersFactory';
import { firstOrCreateReferredEventByUserId } from '../repositories/referredEventRepository';
import { QfRound } from '../entities/qfRound';
import { ChainType } from '../types/network';
import { closeTo, getDefaultSolanaChainId } from '../services/chains';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';
import {
  QACC_DONATION_TOKEN_ADDRESS,
  QACC_DONATION_TOKEN_SYMBOL,
} from '../constants/qacc';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
import { ProjectUserRecord } from '../entities/projectUserRecord';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const moment = require('moment');

// TODO Write test cases
describe('donations() test cases', donationsTestCases);
describe('donationsByProjectId() test cases', donationsByProjectIdTestCases);
describe('donationByUserId() test cases', donationsByUserIdTestCases);
describe('donationsByDonor() test cases', donationsByDonorTestCases);
describe('createDonation() test cases', createDonationTestCases);
// describe('updateDonationStatus() test cases', updateDonationStatusTestCases);
describe('donationsToWallets() test cases', donationsToWalletsTestCases);
describe('donationsFromWallets() test cases', donationsFromWalletsTestCases);
describe('totalDonationsUsdAmount() test cases', donationsUsdAmountTestCases);
describe('totalDonorsCountPerDate() test cases', donorsCountPerDateTestCases);
describe(
  'newDonorsCountAndTotalDonationPerDateTestCases() test cases',
  newDonorsCountAndTotalDonationPerDateTestCases,
);
describe(
  'doesDonatedToProjectInQfRound() test cases',
  doesDonatedToProjectInQfRoundTestCases,
);
describe(
  'totalDonationsNumberPerDate() test cases',
  totalDonationsNumberPerDateTestCases,
);
describe(
  'totalDonationsPerCategoryPerDate() test cases',
  totalDonationsPerCategoryPerDateTestCases,
);
describe('recentDonations() test cases', recentDonationsTestCases);
describe('donationMetrics() test cases', donationMetricsTestCases);

describe('qAcc limit tests', qAccLimitTestCases);

describe('qAcc cap change on donation creation', qAccCapChangeTestCases);

// // describe('tokens() test cases', tokensTestCases);

// // TODO I think we can delete  addUserVerification query
// // describe('addUserVerification() test cases', addUserVerificationTestCases);

function totalDonationsPerCategoryPerDateTestCases() {
  it('should return donations count per category per time range', async () => {
    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchTotalDonationsPerCategoryPerDate,
    });
    const foodDonationsTotalUsd = await Donation.createQueryBuilder('donation')
      .select('COALESCE(SUM(donation."valueUsd")) AS sum')
      .where(`donation.status = 'verified'`)
      .getRawMany();

    assert.isOk(donationsResponse);

    const foodDonationsResponseTotal =
      donationsResponse.data.data.totalDonationsPerCategory.find(
        d => d.title === 'food',
      );

    const donationToVerified = await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(30, 'days').toDate(),
        valueUsd: 20,
      }),
      SEED_DATA.SECOND_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    // Donation to non-verified project
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(30, 'days').toDate(),
        valueUsd: 10,
      }),
      SEED_DATA.SECOND_USER.id,
      SEED_DATA.NON_VERIFIED_PROJECT.id,
    );
    const totalDonationsToVerified = await axios.post(graphqlUrl, {
      query: fetchTotalDonationsPerCategoryPerDate,
      variables: {
        fromDate: moment().add(29, 'days').toDate(),
        toDate: moment().add(31, 'days').toDate(),
        onlyVerified: true,
      },
    });
    const foodTotal =
      totalDonationsToVerified.data.data.totalDonationsPerCategory.find(
        d => d.title === 'food',
      );

    assert.isTrue(
      closeTo(
        foodDonationsResponseTotal.totalUsd,
        foodDonationsTotalUsd[0].sum,
        0.000001,
      ),
    );
    assert.equal(foodTotal.totalUsd, donationToVerified.valueUsd);
  });
}

function totalDonationsNumberPerDateTestCases() {
  it('should return donations count per time range', async () => {
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(22, 'days').toDate(),
        valueUsd: 20,
      }),
      SEED_DATA.SECOND_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(22, 'days').toDate(),
        valueUsd: 30,
      }),
      SEED_DATA.SECOND_USER.id,
      SEED_DATA.NON_VERIFIED_PROJECT.id,
    );
    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchTotalDonationsNumberPerDateRange,
      variables: {
        fromDate: moment().add(21, 'days').toDate().toISOString().split('T')[0],
        toDate: moment().add(23, 'days').toDate().toISOString().split('T')[0],
      },
    });
    const donationsResponseToVerified = await axios.post(graphqlUrl, {
      query: fetchTotalDonationsNumberPerDateRange,
      variables: {
        fromDate: moment().add(21, 'days').toDate().toISOString().split('T')[0],
        toDate: moment().add(23, 'days').toDate().toISOString().split('T')[0],
        onlyVerified: true,
      },
    });
    assert.isNumber(
      donationsResponse.data.data.totalDonationsNumberPerDate.total,
    );
    assert.isTrue(
      donationsResponse.data.data.totalDonationsNumberPerDate
        .totalPerMonthAndYear.length > 0,
    );
    assert.equal(
      donationsResponse.data.data.totalDonationsNumberPerDate.total,
      2,
    );
    assert.equal(
      donationsResponseToVerified.data.data.totalDonationsNumberPerDate.total,
      1,
    );
  });
}

function donorsCountPerDateTestCases() {
  it('should not return data if the date is not yyyy-mm-dd', async () => {
    await saveProjectDirectlyToDb(createProjectData());
    const walletAddress = generateRandomEtheriumAddress();
    await saveUserDirectlyToDb(walletAddress);
    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchTotalDonors,
      variables: {
        fromDate: '2012-30-32',
        toDate: '2012:30:32',
      },
    });
    assert.isOk(donationsResponse);
    assert.isNotEmpty(donationsResponse.data.errors[0]);
    assert.equal(
      donationsResponse.data.errors[0].message,
      errorMessages.INVALID_DATE_FORMAT,
    );
  });
  it('should return donors unique total count in a time range', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(walletAddress);
    // should count as 1 as it's the same user
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(50, 'days').toDate(),
        valueUsd: 20,
      }),
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(50, 'days').toDate(),
        valueUsd: 20,
      }),
      user.id,
      project.id,
    );

    // anonymous donations count as separate
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(50, 'days').toDate(),
        valueUsd: 20,
        anonymous: true,
      }),
      undefined,
      project.id,
    );
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(50, 'days').toDate(),
        valueUsd: 20,
        anonymous: true,
      }),
      undefined,
      project.id,
    );

    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchTotalDonors,
      variables: {
        fromDate: moment().add(49, 'days').toDate().toISOString().split('T')[0],
        toDate: moment().add(51, 'days').toDate().toISOString().split('T')[0],
      },
    });
    assert.isOk(donationsResponse);
    // 1 unique donor and 2 anonymous
    assert.equal(donationsResponse.data.data.totalDonorsCountPerDate.total, 3);
    const total =
      donationsResponse.data.data.totalDonorsCountPerDate.totalPerMonthAndYear.reduce(
        (sum, value) => sum + value.total,
        0,
      );
    assert.equal(
      donationsResponse.data.data.totalDonorsCountPerDate.total,
      total,
    );
  });
}

function newDonorsCountAndTotalDonationPerDateTestCases() {
  it('should return new donors count and their total donation per time range', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(walletAddress);
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(40, 'days').toDate(),
        valueUsd: 30,
      }),
      user.id,
      1,
    );
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(40, 'days').toDate(),
        valueUsd: 25,
      }),
      user.id,
      1,
    );
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(40, 'days').toDate(),
        valueUsd: 20,
      }),
      DONATION_SEED_DATA.FIRST_DONATION.userId,
      1,
    );

    const newDonors = await axios.post(graphqlUrl, {
      query: fetchNewDonorsCount,
      variables: {
        fromDate: moment().add(40, 'days').toDate().toISOString().split('T')[0],
        toDate: moment().add(41, 'days').toDate().toISOString().split('T')[0],
      },
    });
    const donationUsd = await axios.post(graphqlUrl, {
      query: fetchNewDonorsDonationTotalUsd,
      variables: {
        fromDate: moment().add(40, 'days').toDate().toISOString().split('T')[0],
        toDate: moment().add(41, 'days').toDate().toISOString().split('T')[0],
      },
    });
    const totalNewDonors = newDonors.data.data.newDonorsCountPerDate.total;
    const totalDonationUsd =
      donationUsd.data.data.newDonorsDonationTotalUsdPerDate.total;
    assert.isOk(newDonors.data.data.newDonorsCountPerDate);
    assert.isOk(donationUsd.data.data.newDonorsDonationTotalUsdPerDate);
    assert.equal(totalNewDonors, 1);
    assert.equal(totalDonationUsd, 30);
  });
}

function doesDonatedToProjectInQfRoundTestCases() {
  it('should return true when there is verified donation', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    // project.qfRounds = [qfRound];
    // await project.save();
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(walletAddress);
    // should count as 1 as its the same user
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(50, 'days').toDate(),
        valueUsd: 20,
        qfRoundId: qfRound.id,
      }),
      user.id,
      project.id,
    );

    const result = await axios.post(graphqlUrl, {
      query: doesDonatedToProjectInQfRoundQuery,
      variables: {
        projectId: project.id,
        userId: user.id,
        qfRoundId: qfRound.id,
      },
    });
    assert.isTrue(result.data.data.doesDonatedToProjectInQfRound);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return false when donation is non-verified', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    // project.qfRounds = [qfRound];
    // await project.save();
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(walletAddress);
    // should count as 1 as its the same user
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.PENDING,
        createdAt: moment().add(50, 'days').toDate(),
        valueUsd: 20,
        qfRoundId: qfRound.id,
      }),
      user.id,
      project.id,
    );

    const result = await axios.post(graphqlUrl, {
      query: doesDonatedToProjectInQfRoundQuery,
      variables: {
        projectId: project.id,
        userId: user.id,
        qfRoundId: qfRound.id,
      },
    });
    assert.isFalse(result.data.data.doesDonatedToProjectInQfRound);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return false when donation projectId is invalid', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    // project.qfRounds = [qfRound];
    // await project.save();
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(walletAddress);
    // should count as 1 as its the same user
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.PENDING,
        createdAt: moment().add(50, 'days').toDate(),
        valueUsd: 20,
        qfRoundId: qfRound.id,
      }),
      user.id,
      project.id,
    );

    const result = await axios.post(graphqlUrl, {
      query: doesDonatedToProjectInQfRoundQuery,
      variables: {
        projectId: 99999,
        userId: user.id,
        qfRoundId: qfRound.id,
      },
    });
    assert.isFalse(result.data.data.doesDonatedToProjectInQfRound);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return false when donation qfRoundId is invalid', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    // project.qfRounds = [qfRound];
    // await project.save();
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(walletAddress);
    // should count as 1 as its the same user
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.PENDING,
        createdAt: moment().add(50, 'days').toDate(),
        valueUsd: 20,
        qfRoundId: qfRound.id,
      }),
      user.id,
      project.id,
    );

    const result = await axios.post(graphqlUrl, {
      query: doesDonatedToProjectInQfRoundQuery,
      variables: {
        projectId: project.id,
        userId: user.id,
        qfRoundId: 99999,
      },
    });
    assert.isFalse(result.data.data.doesDonatedToProjectInQfRound);

    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return false when donation userId is invalid', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    // project.qfRounds = [qfRound];
    // await project.save();
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(walletAddress);
    // should count as 1 as its the same user
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.PENDING,
        createdAt: moment().add(50, 'days').toDate(),
        valueUsd: 20,
        qfRoundId: qfRound.id,
      }),
      user.id,
      project.id,
    );

    const result = await axios.post(graphqlUrl, {
      query: doesDonatedToProjectInQfRoundQuery,
      variables: {
        projectId: project.id,
        userId: 99999,
        qfRoundId: qfRound.id,
      },
    });
    assert.isFalse(result.data.data.doesDonatedToProjectInQfRound);

    qfRound.isActive = false;
    await qfRound.save();
  });
}

function donationsUsdAmountTestCases() {
  it('should return total usd amount for donations made in a time range', async () => {
    const donationToNonVerified = await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(100, 'days').toDate(),
        valueUsd: 20,
      }),
      SEED_DATA.SECOND_USER.id,
      SEED_DATA.NON_VERIFIED_PROJECT.id,
    );
    const donationToVerified = await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: moment().add(99, 'days').toDate(),
        valueUsd: 10,
      }),
      SEED_DATA.SECOND_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchTotalDonationsUsdAmount,
      variables: {
        fromDate: moment().add(99, 'days').toDate().toISOString().split('T')[0],
        toDate: moment().add(101, 'days').toDate().toISOString().split('T')[0],
      },
    });

    const donationsResponseToVerified = await axios.post(graphqlUrl, {
      query: fetchTotalDonationsUsdAmount,
      variables: {
        fromDate: moment().add(99, 'days').toDate().toISOString().split('T')[0],
        toDate: moment().add(101, 'days').toDate().toISOString().split('T')[0],
        onlyVerified: true,
      },
    });

    assert.isOk(donationsResponse.data.data);
    assert.isOk(donationsResponseToVerified.data.data);
    assert.equal(
      donationsResponse.data.data.donationsTotalUsdPerDate.total,
      donationToNonVerified.valueUsd + donationToVerified.valueUsd,
    );
    const total =
      donationsResponse.data.data.donationsTotalUsdPerDate.totalPerMonthAndYear.reduce(
        (sum, value) => sum + value.total,
        0,
      );
    assert.equal(
      donationsResponse.data.data.donationsTotalUsdPerDate.total,
      total,
    );
    assert.equal(
      donationsResponseToVerified.data.data.donationsTotalUsdPerDate.total,
      donationToVerified.valueUsd,
    );
  });
}

function donationsTestCases() {
  it('should throw error if send invalid fromDate format', async () => {
    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {
        fromDate: '20221203 10:12:30 and status=verified',
      },
    });

    assert.equal(
      donationsResponse.data.errors[0].message,
      errorMessages.INVALID_DATE_FORMAT,
    );
  });
  it('should throw error if send invalid toDate format', async () => {
    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {
        toDate: 'invalid date format',
      },
    });

    assert.equal(
      donationsResponse.data.errors[0].message,
      errorMessages.INVALID_DATE_FORMAT,
    );
  });
  it('should get result without sending time filters', async () => {
    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {},
    });
    assert.isOk(donationsResponse.data.data.donations);
    const allDonationsCount = await Donation.count();
    assert.equal(
      donationsResponse.data.data.donations.length,
      allDonationsCount,
    );
  });
  it('should get result when sending fromDate', async () => {
    const oldDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    oldDonation.createdAt = moment(
      '20220212 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await oldDonation.save();

    const newDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    newDonation.createdAt = moment(
      '20220312 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await newDonation.save();

    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {
        fromDate: '20220215 00:00:01',
      },
    });
    assert.isOk(donationsResponse.data.data.donations);
    const allDonationsCount = await Donation.count();
    assert.notEqual(
      donationsResponse.data.data.donations.length,
      allDonationsCount,
    );
    assert.notOk(
      donationsResponse.data.data.donations.find(
        d => Number(d.id) === oldDonation.id,
      ),
    );
    assert.isOk(
      donationsResponse.data.data.donations.find(
        d => Number(d.id) === newDonation.id,
      ),
    );
  });
  it('should get result when sending toDate', async () => {
    const oldDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    oldDonation.createdAt = moment(
      '20220212 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await oldDonation.save();

    const newDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    newDonation.createdAt = moment(
      '20220312 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await newDonation.save();

    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {
        toDate: '20220215 00:00:01',
      },
    });
    assert.isOk(donationsResponse.data.data.donations);
    const donations = donationsResponse.data.data.donations;
    const allDonationsCount = await Donation.count();
    assert.notEqual(donations.length, allDonationsCount);
    assert.isOk(donations.find(d => Number(d.id) === oldDonation.id));
    assert.notOk(donations.find(d => Number(d.id) === newDonation.id));
    donations.forEach(donation => {
      assert.isOk(donation.user.email);
      assert.isOk(donation.user.firstName);
      assert.isOk(donation.user.walletAddress);
    });
  });
  it('should get result when sending toDate and fromDate', async () => {
    const oldDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    oldDonation.createdAt = moment(
      '20220212 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await oldDonation.save();

    const newDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    newDonation.createdAt = moment(
      '20220312 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await newDonation.save();
    const veryNewDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    veryNewDonation.createdAt = moment(
      '20220320 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await veryNewDonation.save();

    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {
        fromDate: '20220310 00:00:01',
        toDate: '20220315 00:00:01',
      },
    });
    assert.isOk(donationsResponse.data.data.donations);
    const allDonationsCount = await Donation.count();
    assert.notEqual(
      donationsResponse.data.data.donations.length,
      allDonationsCount,
    );
    assert.isOk(
      donationsResponse.data.data.donations.find(
        d => Number(d.id) === newDonation.id,
      ),
    );

    assert.notOk(
      donationsResponse.data.data.donations.find(
        d => Number(d.id) === oldDonation.id,
      ),
    );
    assert.notOk(
      donationsResponse.data.data.donations.find(
        d => Number(d.id) === veryNewDonation.id,
      ),
    );
  });
  it('should project include categories', async () => {
    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {},
    });
    assert.isOk(donationsResponse.data.data.donations);
    donationsResponse.data.data.donations.forEach(donation => {
      assert.isArray(donation.project.categories);
    });
  });
  it('should project include categories', async () => {
    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {},
    });
    assert.isOk(donationsResponse.data.data.donations);
    donationsResponse.data.data.donations.forEach(donation => {
      assert.isArray(donation.project.categories);
    });
  });
}

function createDonationTestCases() {
  let ea;
  beforeEach(async () => {
    ea = await EarlyAccessRound.create({
      roundNumber: generateEARoundNumber(),
      startDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(3, 'days').toDate(),
      roundPOLCapPerProject: 1000000,
      roundPOLCapPerUserPerProject: 50000,
    }).save();
    sinon
      .stub(qAccService, 'getQAccDonationCap')
      .resolves(Number.MAX_SAFE_INTEGER);
  });

  afterEach(async () => {
    sinon.restore();
    if (ea) {
      await ProjectRoundRecord.delete({});
      await ProjectUserRecord.delete({});
      await Donation.delete({ earlyAccessRoundId: ea.id });
      await EarlyAccessRound.delete({});
      ea = null;
    }
  });

  it('do not save referrer wallet if user refers himself', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    abcLauncherMockAdapter.setNextOwnNFT(true);
    const referrerId = generateRandomString();
    const referrerWalletAddress =
      await getChainvineAdapter().getWalletAddressFromReferrer(referrerId);
    const user = await User.create({
      walletAddress: referrerWalletAddress,
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 1,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
          referrerId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isNotOk(donation?.referrerWallet);
  });
  it('should create a donation for giveth project on Qacc Network successfully with referralId', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const referrerId = generateRandomString();
    const referrerWalletAddress =
      await getChainvineAdapter().getWalletAddressFromReferrer(referrerId);

    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();

    await User.create({
      walletAddress: referrerWalletAddress,
      loginType: 'wallet',
      firstName: 'first name',
    }).save();

    const referredEvent = await firstOrCreateReferredEventByUserId(user.id);
    referredEvent.startTime = new Date();
    await referredEvent.save();

    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 1,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
          referrerId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    // assert.isTrue(donation?.isTokenEligibleForGivback);
    // assert.equal(donation?.referrerWallet, user2.walletAddress);
    // assert.isOk(donation?.referralStartTimestamp);
    assert.isNotOk(donation?.qfRound);
    // assert.isTrue(donation?.earlyAccessRound);
  });
  it('should create a donation in an active qfRound', async () => {
    try {
      await EarlyAccessRound.delete({ id: ea.id });
      const project = await saveProjectDirectlyToDb(createProjectData());
      const qfRound = await QfRound.create({
        isActive: true,
        name: new Date().toString(),
        minimumPassportScore: 8,
        slug: new Date().getTime().toString(),
        allocatedFund: 100,
        beginDate: moment().subtract(1, 'days').toDate(),
        endDate: moment().add(2, 'day'),
      }).save();
      // project.qfRounds = [qfRound];
      // await project.save();
      const referrerId = generateRandomString();
      const referrerWalletAddress =
        await getChainvineAdapter().getWalletAddressFromReferrer(referrerId);

      const user = await User.create({
        walletAddress: generateRandomEtheriumAddress(),
        loginType: 'wallet',
        firstName: 'first name',
      }).save();

      await User.create({
        walletAddress: referrerWalletAddress,
        loginType: 'wallet',
        firstName: 'first name',
      }).save();

      const referredEvent = await firstOrCreateReferredEventByUserId(user.id);
      referredEvent.startTime = new Date();
      await referredEvent.save();

      const accessToken = await generateTestAccessToken(user.id);
      const saveDonationResponse = await axios.post(
        graphqlUrl,
        {
          query: createDonationMutation,
          variables: {
            projectId: project.id,
            transactionNetworkId: QACC_NETWORK_ID,
            transactionId: generateRandomEvmTxHash(),
            nonce: 1,
            amount: 10,
            token: QACC_DONATION_TOKEN_SYMBOL,
            referrerId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      assert.isOk(saveDonationResponse.data.data.createDonation);
      const donation = await Donation.findOne({
        where: {
          id: saveDonationResponse.data.data.createDonation,
        },
      });

      assert.equal(donation?.qfRound?.id as number, qfRound.id);
      qfRound.isActive = false;
      await qfRound.save();
    } finally {
      sinon.restore();
    }
  });

  it.skip('should create a solana donation successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await project.save();

    const user = await User.create({
      walletAddress: generateRandomSolanaAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const transactionId =
      '5GAnyapzrTdjhc3xNH6Nsf61xcu1vGRBd7MDXZbx8waKEznSjMtqdgTwHBhrBcrkqTfusHAzeoV3kAVpr6aFXU6j';

    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: 0,
          chainType: ChainType.SOLANA,
          transactionId,
          nonce: 1,
          amount: 10,
          token: 'SOL',
          tokenAddress: '11111111111111111111111111111111',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.equal(donation?.transactionId, transactionId);
    assert.equal(donation?.transactionNetworkId, getDefaultSolanaChainId());
    assert.equal(donation?.chainType, ChainType.SOLANA);
  });

  it.skip('should create a solana donation successfully - 2', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await project.save();

    const user = await User.create({
      walletAddress: generateRandomSolanaAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    // transction id with 87 characters in encoding format
    const transactionId =
      'Z5ZmUhg3bavaX7SMTqapCMNUAJEHWRpvZn884QgHHdbgN1vQ29cxKwoZfprMFdPqNYKScrEpJcXf3br82nDwawR';

    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.SOLANA_MAINNET,
          chainType: ChainType.SOLANA,
          transactionId,
          nonce: 0,
          amount: 100,
          token: 'SOL',
          tokenAddress: '11111111111111111111111111111111',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.equal(donation?.transactionId, transactionId);
    assert.equal(donation?.transactionNetworkId, getDefaultSolanaChainId());
    assert.equal(donation?.chainType, ChainType.SOLANA);
  });

  it.skip('should create a donation in an active qfRound when qfround has network eligiblity on QAcc network', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      allocatedFund: 100,
      eligibleNetworks: [QACC_NETWORK_ID], // accepts ONLY xdai to mark as part of QFround
      beginDate: moment(),
      endDate: moment().add(2, 'day'),
    }).save();
    // project.qfRounds = [qfRound];
    // await project.save();
    const referrerId = generateRandomString();
    const referrerWalletAddress =
      await getChainvineAdapter().getWalletAddressFromReferrer(referrerId);

    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();

    await User.create({
      walletAddress: referrerWalletAddress,
      loginType: 'wallet',
      firstName: 'first name',
    }).save();

    const referredEvent = await firstOrCreateReferredEventByUserId(user.id);
    referredEvent.startTime = new Date();
    await referredEvent.save();

    // should save Xdai
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponseXdai = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 1,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
          referrerId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponseXdai.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponseXdai.data.data.createDonation,
      },
    });

    assert.equal(donation?.qfRound?.id as number, qfRound.id);

    // should ignore non xdai donations because its not an eligible network
    const saveDonationResponseNotXdai = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.CELO,
          transactionId: generateRandomEvmTxHash(),
          nonce: 1,
          amount: 10,
          token: 'GIV',
          referrerId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponseNotXdai.data.data.createDonation);
    const donationNotFromQF = await Donation.findOne({
      where: {
        id: saveDonationResponseNotXdai.data.data.createDonation,
      },
    });
    assert.isNull(donationNotFromQF?.qfRound);
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should create a donation in an active qfRound, when project is not listed', async () => {
    try {
      await EarlyAccessRound.delete({ id: ea.id });
      const project = await saveProjectDirectlyToDb(createProjectData());
      const qfRound = await QfRound.create({
        isActive: true,
        name: new Date().toString(),
        minimumPassportScore: 8,
        slug: new Date().getTime().toString(),
        allocatedFund: 100,
        beginDate: moment().subtract(1, 'days').toDate(),
        endDate: moment().add(2, 'day'),
      }).save();
      // project.qfRounds = [qfRound];
      project.listed = false;
      project.reviewStatus = ReviewStatus.NotListed;
      await project.save();
      const referrerId = generateRandomString();
      const referrerWalletAddress =
        await getChainvineAdapter().getWalletAddressFromReferrer(referrerId);

      const user = await User.create({
        walletAddress: generateRandomEtheriumAddress(),
        loginType: 'wallet',
        firstName: 'first name',
      }).save();

      await User.create({
        walletAddress: referrerWalletAddress,
        loginType: 'wallet',
        firstName: 'first name',
      }).save();

      const referredEvent = await firstOrCreateReferredEventByUserId(user.id);
      referredEvent.startTime = new Date();
      await referredEvent.save();

      const accessToken = await generateTestAccessToken(user.id);
      const saveDonationResponse = await axios.post(
        graphqlUrl,
        {
          query: createDonationMutation,
          variables: {
            projectId: project.id,
            transactionNetworkId: QACC_NETWORK_ID,
            transactionId: generateRandomEvmTxHash(),
            nonce: 1,
            amount: 10,
            token: QACC_DONATION_TOKEN_SYMBOL,
            referrerId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      assert.isOk(saveDonationResponse.data.data.createDonation);
      const donation = await Donation.findOne({
        where: {
          id: saveDonationResponse.data.data.createDonation,
        },
      });

      assert.equal(donation?.qfRound?.id as number, qfRound.id);
      qfRound.isActive = false;
      await qfRound.save();
    } finally {
      sinon.restore();
    }
  });
  it('should create a donation in an active qfRound, when project is not verified', async () => {
    try {
      await EarlyAccessRound.delete({ id: ea.id });
      const project = await saveProjectDirectlyToDb(createProjectData());
      const qfRound = await QfRound.create({
        isActive: true,
        name: new Date().toString(),
        minimumPassportScore: 8,
        slug: new Date().getTime().toString(),
        allocatedFund: 100,
        beginDate: moment().subtract(1, 'days').toDate(),
        endDate: moment().add(2, 'day'),
      }).save();
      // project.qfRounds = [qfRound];
      project.listed = false;
      project.reviewStatus = ReviewStatus.NotListed;
      await project.save();
      const referrerId = generateRandomString();
      const referrerWalletAddress =
        await getChainvineAdapter().getWalletAddressFromReferrer(referrerId);

      const user = await User.create({
        walletAddress: generateRandomEtheriumAddress(),
        loginType: 'wallet',
        firstName: 'first name',
      }).save();

      await User.create({
        walletAddress: referrerWalletAddress,
        loginType: 'wallet',
        firstName: 'first name',
      }).save();

      const referredEvent = await firstOrCreateReferredEventByUserId(user.id);
      referredEvent.startTime = new Date();
      await referredEvent.save();

      const accessToken = await generateTestAccessToken(user.id);
      const saveDonationResponse = await axios.post(
        graphqlUrl,
        {
          query: createDonationMutation,
          variables: {
            projectId: project.id,
            transactionNetworkId: QACC_NETWORK_ID,
            transactionId: generateRandomEvmTxHash(),
            nonce: 1,
            amount: 10,
            token: QACC_DONATION_TOKEN_SYMBOL,
            referrerId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      assert.isOk(saveDonationResponse.data.data.createDonation);
      const donation = await Donation.findOne({
        where: {
          id: saveDonationResponse.data.data.createDonation,
        },
      });

      assert.equal(donation?.qfRound?.id as number, qfRound.id);
      qfRound.isActive = false;
      await qfRound.save();
    } finally {
      sinon.restore();
    }
  });
  it('should create QACC donation for giveth project on qacc network successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 1,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    // const donation = await Donation.findOne({
    //   where: {
    //     id: saveDonationResponse.data.data.createDonation,
    //   },
    // });
    // assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it.skip('should create XDAI StableCoin donation for giveth project on xdai successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const amount = 10;
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomEvmTxHash(),
          nonce: 1,
          amount,
          token: 'WXDAI',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isTrue(donation?.isTokenEligibleForGivback);
    assert.equal(donation?.amount, amount);
  });
  it.skip('should create USDT StableCoin donation for giveth project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const amount = 10;
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomEvmTxHash(),
          nonce: 1,
          amount,
          token: 'USDT',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isTrue(donation?.isTokenEligibleForGivback);
    assert.equal(donation?.amount, amount);
  });
  it.skip('should create GIV donation for giveth project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomEvmTxHash(),
          anonymous: false,
          nonce: 3,
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isTrue(donation?.isTokenEligibleForGivback);
    assert.isFalse(donation?.anonymous);
    assert.isFalse(donation?.segmentNotified);
    assert.equal(donation?.status, DONATION_STATUS.PENDING);
  });
  it.skip('should create custom token donation for giveth project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomEvmTxHash(),
          nonce: 4,
          amount: 10,
          token: 'ABCD',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isFalse(donation?.isTokenEligibleForGivback);
  });
  it.skip('should create GIV donation for trace project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomEvmTxHash(),
          nonce: 5,
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it.skip('should create Not Eligible donation donation for projects in mainnet as nonEligible', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVETH,
    });
    const user = (await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    })) as User;
    const accessToken = await generateTestAccessToken(user.id);
    const token = Token.create({
      name: 'Not eligible',
      symbol: 'NonEligible',
      address: generateRandomEtheriumAddress(),
      decimals: 18,
      isGivbackEligible: false,
      networkId: 1,
    });
    await token.save();
    const givethOrganization = (await Organization.findOne({
      where: {
        label: ORGANIZATION_LABELS.GIVETH,
      },
    })) as Organization;

    await Token.query(
      `INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${givethOrganization.id})
      ;`,
    );
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomEvmTxHash(),
          nonce: 10,
          amount: 10,
          token: 'DOGE',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    // DOGE is in the list but not eligible
    assert.isFalse(donation?.isTokenEligibleForGivback);
  });
  it.skip('should create custom token donation for trace project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomEvmTxHash(),
          amount: 10,
          nonce: 11,
          // custom token
          token: 'ABCD',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isFalse(donation?.isTokenEligibleForGivback);
  });

  it.skip('should create GIV donation for trace project on xdai successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomEvmTxHash(),
          nonce: 12,
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it.skip('should throw error when create GIV donation for endaoment project on xdai', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.ENDAOMENT,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomEvmTxHash(),
          nonce: 11,
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
    );
  });
  it.skip('should throw error when create GIV donation for endaoment project on mainnet', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.ENDAOMENT,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomEvmTxHash(),
          nonce: 13,
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
    );
  });
  // simulates staging env they only accept ETH
  it.skip('should create ETH donation for CHANGE project on Ropsten successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ where: { id: SEED_DATA.ADMIN_USER.id } });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.ROPSTEN,
          transactionId: generateRandomEvmTxHash(),
          amount: 10,
          nonce: 11,
          token: 'ETH',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
  });
  it.skip('should create ETH donation for CHANGE project on goerli successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ where: { id: SEED_DATA.ADMIN_USER.id } });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.GOERLI,
          transactionId: generateRandomEvmTxHash(),
          amount: 10,
          nonce: 11,
          token: 'ETH',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
  });
  // for production they only accept ETH on mainnet
  it.skip('should create ETH donation for CHANGE project on Mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ where: { id: SEED_DATA.ADMIN_USER.id } });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomEvmTxHash(),
          nonce: 13,
          amount: 10,
          token: 'ETH',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
  });
  // they do not accept DAI (same would apply for any other random token)
  it.skip('should throw error when create DAI donation for CHANGE project on mainnet', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ where: { id: SEED_DATA.ADMIN_USER.id } });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomEvmTxHash(),
          nonce: 14,
          amount: 10,
          token: 'DAI',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
    );
  });
  // they do not accept DAI (same would apply for any other random token)
  it.skip('should throw error when create DAI donation for CHANGE project on Xdai Chain', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ where: { id: SEED_DATA.ADMIN_USER.id } });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomEvmTxHash(),
          amount: 10,
          nonce: 13,
          token: 'XDAI',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
    );
  });
  it.skip('should create ETH donation for endaoment project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.ENDAOMENT,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomEvmTxHash(),
          nonce: 15,
          amount: 10,
          token: 'ETH',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should throw exception when creating donation for not logged-in users', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const saveDonationResponse = await axios.post(graphqlUrl, {
      query: createDonationMutation,
      variables: {
        projectId: project.id,
        transactionNetworkId: QACC_NETWORK_ID,
        transactionId: generateRandomEvmTxHash(),
        nonce: 3,
        amount: 10,
        token: QACC_DONATION_TOKEN_SYMBOL,
      },
    });
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.UN_AUTHORIZED,
    );
  });
  it('should throw error when access token has no userId', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateUserIdLessAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 3,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.UN_AUTHORIZED,
    );
  });
  it('should create donation anonymously successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          anonymous: true,
          transactionId: generateRandomEvmTxHash(),
          nonce: 4,
          amount: 10.11,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isOk(donation);
    assert.equal(donation?.userId, user.id);
    assert.equal(donation?.amount, 10.11);
    assert.isTrue(donation?.anonymous);
    // assert.isTrue(donation?.isTokenEligibleForGivback);
  });

  it('should create donation with safeTransactionId successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const safeTransactionHash = 'xxxxxxx';
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          nonce: 4,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
          safeTransactionId: safeTransactionHash,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.equal(donation?.userId, user.id);
    assert.equal(donation?.safeTransactionId, safeTransactionHash);
  });

  it('should fill usd value of when creating QACC Token donation', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 12,
          amount: 1000,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isOk(donation);
    assert.isOk(donation?.valueUsd);
    assert.isOk(donation?.priceUsd);
    // assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should donation have false for segmentNotified after creation', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          amount: 10,
          nonce: 6,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isOk(donation);
    assert.isFalse(donation?.segmentNotified);
  });
  it('should throw exception when send invalid projectId', async () => {
    await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: 999999,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 13,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });
  it('should isProjectVerified be true after create donation for verified projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: true,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 1,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isOk(donation);
    assert.isTrue(donation?.isProjectVerified);
  });
  it('should isProjectVerified be true after create donation for unVerified projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: false,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          amount: 10,
          nonce: 11,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isOk(donation);
    assert.isFalse(donation?.isProjectVerified);
  });
  it('should throw exception when donating to draft projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.drafted,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 12,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
    );
  });
  it('should throw exception when donating to cancelled projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.cancelled,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          amount: 10,
          nonce: 14,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
    );
  });
  it('should throw exception when donating to deactivated projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 15,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
    );
  });
  it('should throw exception when amount is zero', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 11,
          amount: 0,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      '"amount" must be greater than 0',
    );
  });
  it('should throw exception when amount is negative', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 11,
          amount: -10,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      '"amount" must be greater than 0',
    );
  });
  it('should throw exception when transactionId is invalid', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: 'fjdahfksj0323423',
          nonce: 11,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.INVALID_TRANSACTION_ID,
    );
  });
  it('should throw exception when transactionNetworkId is invalid', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: 203,
          transactionId: generateRandomEvmTxHash(),
          nonce: 11,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isTrue(
      (saveDonationResponse.data.errors[0].message as string).startsWith(
        '"transactionNetworkId" must be one of [',
      ),
    );
  });
  it.skip('should not throw exception when currency is not valid when currency is USDC.e', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'fatemeTest1',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomEvmTxHash(),
          nonce: 15,
          amount: 10,
          token: 'GIV!!',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });
    assert.isOk(donation);
  });
  it.skip('should throw exception when chainType is SOLANA but send EVM tokenAddress', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomSolanaAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const tokenAddress = generateRandomEtheriumAddress();
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.SOLANA_TESTNET,
          transactionId: generateRandomSolanaTxHash(),
          tokenAddress,
          nonce: 11,
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.INVALID_TOKEN_ADDRESS,
    );
  });
  it.skip('should throw exception when chainType is EVM but send SOLANA tokenAddress #1', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomEvmTxHash(),
          // SOLANA token address
          tokenAddress: '11111111111111111111111111111111',
          chainType: ChainType.EVM,
          nonce: 11,
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.INVALID_TOKEN_ADDRESS,
    );
  });
  it.skip('should throw exception when chainType is EVM but send SOLANA tokenAddress #2', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomEvmTxHash(),
          // SOLANA token address
          tokenAddress: generateRandomSolanaAddress(),
          chainType: ChainType.EVM,
          nonce: 11,
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.INVALID_TOKEN_ADDRESS,
    );
  });

  it('should mark draft donation as matched after donation creation', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();

    // clear all draft donations
    await DraftDonation.clear();
    // create draft donation
    const draftDonation = await DraftDonation.create({
      projectId: project.id,
      fromWalletAddress: user.walletAddress,
      toWalletAddress: project.walletAddress,
      networkId: QACC_NETWORK_ID,
      amount: 10,
      currency: QACC_DONATION_TOKEN_SYMBOL,
      status: DRAFT_DONATION_STATUS.PENDING,
    }).save();

    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          anonymous: false,
          nonce: 3,
          amount: 10,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const updatedDraftDonation = await DraftDonation.findOne({
      where: {
        id: draftDonation.id,
      },
    });
    assert.equal(updatedDraftDonation?.status, DRAFT_DONATION_STATUS.MATCHED);
    assert.isOk(updatedDraftDonation?.matchedDonationId);
    assert.equal(
      updatedDraftDonation?.matchedDonationId,
      saveDonationResponse.data.data.createDonation,
    );
  });

  describe('swap donation test cases', () => {
    it('should create a donation with swap transaction', async () => {
      const project = await saveProjectDirectlyToDb(createProjectData());
      const walletAddress = generateRandomEtheriumAddress();
      const user = await saveUserDirectlyToDb(walletAddress);
      const accessToken = await generateTestAccessToken(user.id);

      const swapData = {
        squidRequestId: 'test-squid-request-id',
        firstTxHash: generateRandomEvmTxHash(),
        fromChainId: NETWORK_IDS.MAIN_NET,
        toChainId: NETWORK_IDS.POLYGON,
        fromTokenAddress: generateRandomEtheriumAddress(),
        toTokenAddress: QACC_DONATION_TOKEN_ADDRESS,
        fromAmount: 100,
        toAmount: 95,
        fromTokenSymbol: 'ETH',
        toTokenSymbol: QACC_DONATION_TOKEN_SYMBOL,
        metadata: { test: 'data' },
      };

      const variables = {
        projectId: project.id,
        transactionNetworkId: QACC_NETWORK_ID,
        transactionId: generateRandomEvmTxHash(),
        token: QACC_DONATION_TOKEN_SYMBOL,
        amount: 95,
        nonce: 11,
        swapData,
      };

      const response = await axios.post(
        graphqlUrl,
        {
          query: createDonationMutation,
          variables,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      assert.isOk(response.data.data.createDonation);
      const donationId = response.data.data.createDonation;
      const donation = await Donation.findOne({
        where: { id: donationId },
        relations: ['swapTransaction'],
      });

      assert.isOk(donation);
      assert.isTrue(donation?.isSwap);
      assert.isOk(donation?.swapTransaction);
      assert.equal(
        donation?.swapTransaction?.squidRequestId,
        swapData.squidRequestId,
      );
      assert.equal(
        donation?.swapTransaction?.firstTxHash,
        swapData.firstTxHash,
      );
      assert.equal(
        donation?.swapTransaction?.fromChainId,
        swapData.fromChainId,
      );
      assert.equal(donation?.swapTransaction?.toChainId, swapData.toChainId);
      assert.equal(
        donation?.swapTransaction?.fromTokenAddress,
        swapData.fromTokenAddress,
      );
      assert.equal(
        donation?.swapTransaction?.toTokenAddress,
        swapData.toTokenAddress,
      );
      assert.equal(donation?.swapTransaction?.fromAmount, swapData.fromAmount);
      assert.equal(donation?.swapTransaction?.toAmount, swapData.toAmount);
      assert.equal(
        donation?.swapTransaction?.fromTokenSymbol,
        swapData.fromTokenSymbol,
      );
      assert.equal(
        donation?.swapTransaction?.toTokenSymbol,
        swapData.toTokenSymbol,
      );
      assert.deepEqual(donation?.swapTransaction?.metadata, swapData.metadata);
    });

    it('should create a donation without swap transaction when swapData is not provided', async () => {
      const project = await saveProjectDirectlyToDb(createProjectData());
      const walletAddress = generateRandomEtheriumAddress();
      const user = await saveUserDirectlyToDb(walletAddress);
      const accessToken = await generateTestAccessToken(user.id);

      const variables = {
        amount: 100,
        transactionId: generateRandomEvmTxHash(),
        transactionNetworkId: QACC_NETWORK_ID,
        token: QACC_DONATION_TOKEN_SYMBOL,
        projectId: project.id,
        nonce: 11,
      };

      const response = await axios.post(
        graphqlUrl,
        {
          query: createDonationMutation,
          variables,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      assert.isOk(response.data.data.createDonation);
      const donationId = response.data.data.createDonation;
      const donation = await Donation.findOne({
        where: { id: donationId },
        relations: ['swapTransaction'],
      });

      assert.isOk(donation);
      assert.isFalse(donation?.isSwap);
      assert.isNull(donation?.swapTransaction);
    });

    it('should validate swap transaction data', async () => {
      const project = await saveProjectDirectlyToDb(createProjectData());
      const walletAddress = generateRandomEtheriumAddress();
      const user = await saveUserDirectlyToDb(walletAddress);
      const accessToken = await generateTestAccessToken(user.id);

      const swapData = {
        // Missing required fields
        squidRequestId: 'test-squid-request-id',
        firstTxHash: generateRandomEvmTxHash(),
        fromChainId: NETWORK_IDS.MAIN_NET,
        // Missing toChainId
        fromTokenAddress: generateRandomEtheriumAddress(),
        // Missing toTokenAddress
        fromAmount: 100,
        toAmount: 95,
        fromTokenSymbol: 'ETH',
        toTokenSymbol: 'MATIC',
      };

      const variables = {
        amount: 95,
        nonce: 11,
        transactionId: generateRandomEvmTxHash(),
        transactionNetworkId: NETWORK_IDS.POLYGON,
        token: 'MATIC',
        projectId: project.id,
        swapData,
      };

      const response = await axios.post(
        graphqlUrl,
        {
          query: createDonationMutation,
          variables,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      assert.isOk(response.data.errors);
      assert.isNotEmpty(response.data.errors);
      // The exact error message will depend on your validation setup
      assert.include(
        response.data.errors[0].message,
        'Variable "$swapData" got invalid value',
      );
    });
  });
}

function donationsFromWalletsTestCases() {
  it('should find donations with special source successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(walletAddress);
    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      user.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsFromWallets,
        variables: {
          fromWalletAddresses: [walletAddress],
        },
      },
      {},
    );
    // assert.isNotEmpty(result.data.data.donationsFromWallets);
    result.data.data.donationsFromWallets.forEach(item => {
      assert.equal(item.fromWalletAddress, walletAddress);
      assert.isOk(item.user.email);
      assert.isOk(item.user.walletAddress);
    });
  });
  it('should find donations with special source in uppercase successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(walletAddress);
    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      user.id,
      project.id,
    );
    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsFromWallets,
        variables: {
          fromWalletAddresses: [walletAddress.toUpperCase()],
        },
      },
      {},
    );

    result.data.data.donationsFromWallets.forEach(item => {
      assert.equal(item.fromWalletAddress, walletAddress);
      assert.isOk(item.user.email);
      assert.isOk(item.user.walletAddress);
    });
  });
  it('should find donations with special source unsuccessfully', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const walletAddress2 = generateRandomEtheriumAddress();
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(walletAddress);
    const user2 = await saveUserDirectlyToDb(walletAddress2);
    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      user.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      user2.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsFromWallets,
        variables: {
          fromWalletAddresses: [walletAddress],
        },
      },
      {},
    );
    // assert.isNotEmpty(result.data.data.donationsFromWallets);
    result.data.data.donationsFromWallets.forEach(item => {
      assert.equal(
        item.fromWalletAddress.toLowerCase(),
        walletAddress.toLowerCase(),
      );
      assert.isOk(item.user.email);
      assert.isOk(item.user.walletAddress);
    });
  });

  it('should find no donations with this source ', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsFromWallets,
        variables: {
          fromWalletAddresses: [walletAddress],
        },
      },
      {},
    );
    assert.equal(result.data.data.donationsFromWallets.length, 0);
  });
}

function donationsByProjectIdTestCases() {
  let ea;
  beforeEach(async () => {
    await Donation.delete({
      id: Not(In(Object.values(DONATION_SEED_DATA).map(d => d.id))),
    });

    ea = await EarlyAccessRound.create({
      roundNumber: generateEARoundNumber(),
      startDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(3, 'days').toDate(),
      roundPOLCapPerProject: 1000000,
      roundPOLCapPerUserPerProject: 50000,
    }).save();

    sinon
      .stub(qAccService, 'getQAccDonationCap')
      .resolves(Number.MAX_SAFE_INTEGER);
  });

  afterEach(async () => {
    sinon.restore();
    // Clean up data before each test case
    if (ea) {
      await ProjectRoundRecord.delete({});
      await ProjectUserRecord.delete({});
      await Donation.delete({ earlyAccessRoundId: ea.id });
      await EarlyAccessRound.delete({});
      ea = null;
    }
  });

  it('should return filtered by qfRound donations when specified', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      allocatedFund: 100,
      beginDate: moment(),
      endDate: moment().add(2, 'day'),
    }).save();
    // project.qfRounds = [qfRound];
    // await project.save();
    const referrerId = generateRandomString();
    const referrerWalletAddress =
      await getChainvineAdapter().getWalletAddressFromReferrer(referrerId);

    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();

    await User.create({
      walletAddress: referrerWalletAddress,
      loginType: 'wallet',
      firstName: 'first name',
    }).save();

    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: qfRound.id,
      }),
      user.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: qfRound.id,
      }),
      user.id,
      project.id,
    );
    qfRound.isActive = false;
    await qfRound.save();

    // second QF round
    const qfRound2 = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      allocatedFund: 100,
      beginDate: moment(),
      endDate: moment().add(2, 'day'),
    }).save();
    // project.qfRounds = [qfRound2];
    // await project.save();

    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: qfRound2.id,
      }),
      user.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        qfRoundId: qfRound2.id,
      }),
      user.id,
      project.id,
    );

    const resultForRound1 = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          qfRoundId: qfRound.id,
          orderBy: {
            field: 'CreationDate',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const qfRound1donations =
      resultForRound1.data.data.donationsByProjectId.donations;
    assert.equal(qfRound1donations.length, 2);
    qfRound1donations.forEach(donation => {
      assert.equal(Number(donation.qfRound.id), qfRound.id);
    });

    const resultForRound2 = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          qfRoundId: qfRound2.id,
          orderBy: {
            field: 'CreationDate',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const qfRound2donations =
      resultForRound2.data.data.donationsByProjectId.donations;
    assert.equal(qfRound2donations.length, 2);
    qfRound2donations.forEach(donation => {
      assert.equal(Number(donation.qfRound.id), qfRound2.id);
    });

    qfRound2.isActive = false;
    await qfRound2.save();
  });

  it('should sort by the createdAt DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'CreationDate',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(Number(donations[0].id), DONATION_SEED_DATA.FIFTH_DONATION.id);
    donations.forEach(donation => {
      assert.isOk(donation.user.email);
      assert.isOk(donation.user.firstName);
      assert.isOk(donation.user.walletAddress);
    });
  });
  it('should sort by createdAt ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'CreationDate',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.isTrue(donations[1].createdAt >= donations[0].createdAt);
  });
  it('should sort by amount DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'TokenAmount',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(
      Number(donations[0].id),
      DONATION_SEED_DATA.SECOND_DONATION.id,
    );
  });
  it('should sort by amount ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'TokenAmount',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(Number(donations[0].id), DONATION_SEED_DATA.FIFTH_DONATION.id);
  });
  it('should sort by valueUsd DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'UsdAmount',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(
      Number(donations[0].id),
      DONATION_SEED_DATA.SECOND_DONATION.id,
    );
  });
  it('should sort by valueUsd ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'UsdAmount',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(Number(donations[0].id), DONATION_SEED_DATA.FIFTH_DONATION.id);
  });
  it('should search by user name except anonymous donations', async () => {
    const anonymousDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.THIRD_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    anonymousDonation.anonymous = true;
    await anonymousDonation.save();

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          searchTerm: 'third',
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(
      Number(donations[0]?.id),
      DONATION_SEED_DATA.FIFTH_DONATION.id,
    );

    const anonymousDonations = donations.filter(d => d.anonymous === true);
    assert.isTrue(anonymousDonations.length === 0);
  });

  // TODO Fix this test case because it sometimes fails
  // it('should search by donation amount', async () => {
  //   const donation = await saveDonationDirectlyToDb(
  //     createDonationData(),
  //     SEED_DATA.THIRD_USER.id,
  //     SEED_DATA.FIRST_PROJECT.id,
  //   );
  //   donation.status = DONATION_STATUS.VERIFIED;
  //   donation.amount = 100;
  //   await donation.save();
  //   const result = await axios.post(
  //     graphqlUrl,
  //     {
  //       query: fetchDonationsByProjectIdQuery,
  //       variables: {
  //         projectId: SEED_DATA.FIRST_PROJECT.id,
  //         searchTerm: '100',
  //       },
  //     },
  //     {},
  //   );
  //   const amountDonationsCount = await Donation.createQueryBuilder('donation')
  //     .where('donation.amount = :amount', { amount: 100 })
  //     .getCount();
  //   const donations = result.data.data.donationsByProjectId.donations;
  //   assert.equal(donations[0]?.amount, 100);
  //   assert.equal(donations.length, amountDonationsCount);
  // });

  it('should search by donation currency', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          searchTerm: DONATION_SEED_DATA.FIRST_DONATION.currency, // GIV
        },
      },
      {},
    );

    const GivDonationsCount = await Donation.createQueryBuilder('donation')
      .where('donation.currency = :currency', {
        currency: DONATION_SEED_DATA.FIRST_DONATION.currency,
      })
      .getCount();

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(
      donations[0]?.currency,
      DONATION_SEED_DATA.FIRST_DONATION.currency,
    );
    assert.equal(donations.length, GivDonationsCount);
  });
  it('should search by donation ToWalletAddress', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          searchTerm: DONATION_SEED_DATA.FIRST_DONATION.toWalletAddress,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    donations.forEach(d =>
      assert.equal(d.toWalletAddress, SEED_DATA.FIRST_PROJECT.walletAddress),
    );

    assert.isTrue(donations.length > 0);
  });
  it('should search by donation fromWalletAddress', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          searchTerm: DONATION_SEED_DATA.FIRST_DONATION.fromWalletAddress,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    donations.forEach(d =>
      assert.equal(
        d.fromWalletAddress,
        DONATION_SEED_DATA.FIRST_DONATION.fromWalletAddress,
      ),
    );

    assert.isTrue(donations.length > 0);
  });
  it('should filter donations by failed status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const verifiedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.VERIFIED },
      user.id,
      project.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.FAILED },
      user.id,
      project.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.PENDING },
      user.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          status: DONATION_STATUS.FAILED,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    donations.forEach(item => {
      assert.equal(item.status, DONATION_STATUS.FAILED);
    });
    assert.isOk(
      donations.find(donation => Number(donation.id) === failedDonation.id),
    );
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === verifiedDonation.id),
    );
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === pendingDonation.id),
    );
  });
  it('should filter donations by pending status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const verifiedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.VERIFIED },
      user.id,
      project.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.FAILED },
      user.id,
      project.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.PENDING },
      user.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          status: DONATION_STATUS.PENDING,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    donations.forEach(item => {
      assert.equal(item.status, DONATION_STATUS.PENDING);
    });
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === failedDonation.id),
    );
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === verifiedDonation.id),
    );
    assert.isOk(
      donations.find(donation => Number(donation.id) === pendingDonation.id),
    );
  });
  it('should filter donations by verified status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const verifiedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.VERIFIED },
      user.id,
      project.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.FAILED },
      user.id,
      project.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.PENDING },
      user.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          status: DONATION_STATUS.VERIFIED,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    donations.forEach(item => {
      assert.equal(item.status, DONATION_STATUS.VERIFIED);
    });
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === failedDonation.id),
    );
    assert.isOk(
      donations.find(donation => Number(donation.id) === verifiedDonation.id),
    );
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === pendingDonation.id),
    );
  });
  it('should return all donations when not sending status filter', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const verifiedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.VERIFIED },
      user.id,
      project.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.FAILED },
      user.id,
      project.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.PENDING },
      user.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.isOk(
      donations.find(donation => Number(donation.id) === failedDonation.id),
    );
    assert.isOk(
      donations.find(donation => Number(donation.id) === verifiedDonation.id),
    );
    assert.isOk(
      donations.find(donation => Number(donation.id) === pendingDonation.id),
    );
  });
  it('should list donations made through create donation resolver', async () => {
    const numberOfDonations = 10;
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    for (let i = 0; i < numberOfDonations; i++) {
      const saveDonationResponse = await axios.post(
        graphqlUrl,
        {
          query: createDonationMutation,
          variables: {
            projectId: project.id,
            transactionNetworkId: QACC_NETWORK_ID,
            transactionId: generateRandomEvmTxHash(),
            nonce: 100 + i,
            amount: 1000 * (i + 1),
            token: QACC_DONATION_TOKEN_SYMBOL,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      assert.isOk(saveDonationResponse.data.data.createDonation);
      const donation = await Donation.findOne({
        where: {
          id: saveDonationResponse.data.data.createDonation,
        },
      });
      assert.isOk(donation);
      assert.isOk(donation?.valueUsd);
      assert.isOk(donation?.priceUsd);
    }

    // Make all donations verified
    await Donation.update(
      { projectId: project.id },
      { status: DONATION_STATUS.VERIFIED },
    );
    // assert.isTrue(donation?.isTokenEligibleForGivback);

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: project.id,
          status: DONATION_STATUS.VERIFIED,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.lengthOf(donations, numberOfDonations);
    donations.forEach(item => {
      assert.equal(item.status, DONATION_STATUS.VERIFIED);
    });
  });

  it('should return donations filtered by projectId', async () => {
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());

    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const donationToProject1 = await saveDonationDirectlyToDb(
      createDonationData(),
      user.id,
      project1.id,
    );

    await saveDonationDirectlyToDb(createDonationData(), user.id, project2.id);

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: project1.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;

    // Verify only donations related to project1 are returned
    assert.isTrue(donations.length === 1);
    assert.equal(donations[0].id, donationToProject1.id);
  });
}

function donationsByUserIdTestCases() {
  it('should sort by tokens donated DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'TokenAmount',
            direction: 'DESC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(donations[0].amount > donations[donationsCount - 1].amount);
  });
  it('should sort by tokens donated ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'TokenAmount',
            direction: 'ASC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(donations[0].amount <= donations[donationsCount - 1].amount);
  });
  it('should sort by USD value donated DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'UsdAmount',
            direction: 'DESC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(
      donations[0].valueUsd > donations[donationsCount - 1].valueUsd,
    );
  });
  it('should sort by USD value donated ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'UsdAmount',
            direction: 'ASC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(
      donations[0].valueUsd <= donations[donationsCount - 1].valueUsd,
    );
  });
  it('should sort by createdAt DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'DESC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(
      Date.parse(donations[0].createdAt) >
        Date.parse(donations[donationsCount - 1].createdAt),
    );
  });
  it('should sort by createdAt ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'ASC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(
      Date.parse(donations[0].createdAt) <
        Date.parse(donations[donationsCount - 1].createdAt),
    );
  });
  it('should not find anonymous donation', async () => {
    const anonymousDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.THIRD_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    anonymousDonation.anonymous = true;
    await anonymousDonation.save();
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'ASC',
          },
          userId: SEED_DATA.THIRD_USER.id,
        },
      },
      {},
    );

    result.data.data.donationsByUserId.donations.forEach(item => {
      assert.equal(item.anonymous, false);
    });
  });
  it('should  find his/her own anonymous donation for logged in user', async () => {
    const user = await User.create({
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    }).save();
    const title = String(new Date().getTime());
    const projectData = {
      // title: `test project`,
      title,
      description: 'test description',
      walletAddress: generateRandomEtheriumAddress(),
      categories: ['food1'],
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
      giveBacks: false,
      creationDate: new Date(),
      updatedAt: new Date(),
      latestUpdateCreationDate: new Date(),
      slug: title,
      // firstUser's id
      adminUserId: user.id,
      qualityScore: 30,
      // just need the initial value to be different from 0
      totalDonations: 10,
      totalReactions: 0,
      totalProjectUpdates: 1,
      abc: createProjectAbcData(),
    };
    const firstUserAccessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb(projectData);

    const donationData = {
      transactionId: generateRandomEvmTxHash(),
      transactionNetworkId: NETWORK_IDS.MAIN_NET,
      toWalletAddress: generateRandomEtheriumAddress(),
      fromWalletAddress: generateRandomEtheriumAddress(),
      currency: 'ETH',
      anonymous: true,
      amount: 10,
      valueUsd: 15,
      userId: user.id,
      projectId: project.id,
      createdAt: moment(),
      segmentNotified: true,
    };

    const anonymousDonation = await saveDonationDirectlyToDb(
      donationData,
      user.id,
      project.id,
    );

    anonymousDonation.anonymous = true;
    await anonymousDonation.save();
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'ASC',
          },
          userId: user.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(
      String(result.data.data.donationsByUserId.donations[0].user.id),
      String(user.id),
    );
    assert.equal(
      result.data.data.donationsByUserId.donations[0].anonymous,
      true,
    );
  });
  it('should  find just not anonymous donation for user is not login', async () => {
    const user = await User.create({
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    }).save();
    const title = String(new Date().getTime());
    const walletAddress = generateRandomEtheriumAddress();
    const projectData = {
      // title: `test project`,
      title,
      description: 'test description',
      walletAddress,
      categories: ['food1'],
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
      giveBacks: false,
      creationDate: new Date(),
      updatedAt: new Date(),
      latestUpdateCreationDate: new Date(),
      slug: title,
      // firstUser's id
      adminUserId: user.id,
      qualityScore: 30,
      // just need the initial value to be different than 0
      totalDonations: 10,
      totalReactions: 0,
      totalProjectUpdates: 1,
      abc: createProjectAbcData({ projectAddress: walletAddress }),
    };
    const project = await saveProjectDirectlyToDb(projectData);

    const donationDataAnonymous = {
      transactionId: generateRandomEvmTxHash(),
      transactionNetworkId: NETWORK_IDS.MAIN_NET,
      toWalletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
      fromWalletAddress: SEED_DATA.FIRST_USER.walletAddress,
      currency: 'ETH',
      anonymous: true,
      amount: 15,
      valueUsd: 15,
      userId: user.id,
      projectId: project.id,
      createdAt: moment(),
      segmentNotified: true,
    };

    const donationDataNotAnonymous = {
      transactionId: generateRandomEvmTxHash(),
      transactionNetworkId: NETWORK_IDS.MAIN_NET,
      toWalletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
      fromWalletAddress: SEED_DATA.FIRST_USER.walletAddress,
      currency: 'ETH',
      anonymous: false,
      amount: 15,
      valueUsd: 15,
      userId: user.id,
      projectId: project.id,
      createdAt: moment(),
      segmentNotified: true,
    };

    const notAnonymousDonation = await saveDonationDirectlyToDb(
      donationDataNotAnonymous,
      user.id,
      project.id,
    );

    const anonymousDonation = await saveDonationDirectlyToDb(
      donationDataAnonymous,
      user.id,
      project.id,
    );

    notAnonymousDonation.anonymous = false;
    anonymousDonation.anonymous = true;
    await notAnonymousDonation.save();
    await anonymousDonation.save();
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'ASC',
          },
          userId: user.id,
        },
      },
      {},
    );
    assert.equal(
      String(result.data.data.donationsByUserId.donations[0].user.id),
      String(user.id),
    );
    assert.equal(result.data.data.donationsByUserId.donations.length, 1);
    assert.equal(
      result.data.data.donationsByUserId.donations[0].anonymous,
      false,
    );
  });
  it('should filter donations by failed status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const verifiedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.VERIFIED },
      user.id,
      project.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.FAILED },
      user.id,
      project.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.PENDING },
      user.id,
      project.id,
    );

    const result = await axios.post(graphqlUrl, {
      query: fetchDonationsByUserIdQuery,
      variables: {
        orderBy: {
          field: 'UsdAmount',
          direction: 'DESC',
        },
        status: DONATION_STATUS.FAILED,
        userId: user.id,
      },
    });
    const donations = result.data.data.donationsByUserId.donations;
    donations.forEach(item => {
      assert.equal(item.status, DONATION_STATUS.FAILED);
    });
    assert.isOk(
      donations.find(donation => Number(donation.id) === failedDonation.id),
    );
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === verifiedDonation.id),
    );
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === pendingDonation.id),
    );
  });
  it('should filter donations by verified status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const verifiedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.VERIFIED },
      user.id,
      project.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.FAILED },
      user.id,
      project.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.PENDING },
      user.id,
      project.id,
    );

    const result = await axios.post(graphqlUrl, {
      query: fetchDonationsByUserIdQuery,
      variables: {
        orderBy: {
          field: 'UsdAmount',
          direction: 'DESC',
        },
        status: DONATION_STATUS.VERIFIED,
        userId: user.id,
      },
    });
    const donations = result.data.data.donationsByUserId.donations;
    donations.forEach(item => {
      assert.equal(item.status, DONATION_STATUS.VERIFIED);
    });
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === failedDonation.id),
    );
    assert.isOk(
      donations.find(donation => Number(donation.id) === verifiedDonation.id),
    );
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === pendingDonation.id),
    );
  });
  it('should filter donations by pending status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const verifiedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.VERIFIED },
      user.id,
      project.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.FAILED }),
      user.id,
      project.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.PENDING }),

      user.id,
      project.id,
    );

    const result = await axios.post(graphqlUrl, {
      query: fetchDonationsByUserIdQuery,
      variables: {
        orderBy: {
          field: 'UsdAmount',
          direction: 'DESC',
        },
        status: DONATION_STATUS.PENDING,
        userId: user.id,
      },
    });
    const donations = result.data.data.donationsByUserId.donations;
    donations.forEach(item => {
      assert.equal(item.status, DONATION_STATUS.PENDING);
    });
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === failedDonation.id),
    );
    assert.isNotOk(
      donations.find(donation => Number(donation.id) === verifiedDonation.id),
    );
    assert.isOk(
      donations.find(donation => Number(donation.id) === pendingDonation.id),
    );
  });
  it('should return all donations when not sending status', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const verifiedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.VERIFIED },
      user.id,
      project.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.FAILED },
      user.id,
      project.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      { ...createDonationData(), status: DONATION_STATUS.PENDING },
      user.id,
      project.id,
    );

    const result = await axios.post(graphqlUrl, {
      query: fetchDonationsByUserIdQuery,
      variables: {
        orderBy: {
          field: 'UsdAmount',
          direction: 'DESC',
        },
        userId: user.id,
      },
    });
    const donations = result.data.data.donationsByUserId.donations;
    assert.isOk(
      donations.find(donation => Number(donation.id) === failedDonation.id),
    );
    assert.isOk(
      donations.find(donation => Number(donation.id) === verifiedDonation.id),
    );
    assert.isOk(
      donations.find(donation => Number(donation.id) === pendingDonation.id),
    );
  });
  describe('with default createdAt DESC sort', () => {
    it('should paginate results by indicated take and skip', async () => {
      const result = await axios.post(
        graphqlUrl,
        {
          query: fetchDonationsByUserIdQuery,
          variables: {
            take: 1,
            skip: 1,
            userId: SEED_DATA.FIRST_USER.id,
          },
        },
        {},
      );

      const donations = result.data.data.donationsByUserId.donations;
      const donationsCount = donations.length;
      assert.equal(donationsCount, 1);
      assert.isTrue(
        donations[0].id !== String(DONATION_SEED_DATA.FIFTH_DONATION.id),
      );
    });
  });
  it('should join with qfRound', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(1, 'day').toDate(),
    }).save();
    // project.qfRounds = [qfRound];
    // await project.save();

    const donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
      },
      donor.id,
      project.id,
    );
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'DESC',
          },
          userId: donor.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    assert.equal(donations[0].id, donation.id);
    assert.equal(donations[0].qfRound.id, qfRound.id);
    qfRound.isActive = false;
    await qfRound.save();
  });
}

function donationsByDonorTestCases() {
  it('should return the user made donations', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const firstUserDonations = await Donation.find({
      where: { user: { id: SEED_DATA.FIRST_USER.id } },
    });
    const firstUserResult = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByDonorQuery,
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );

    const secondUserAccessToken = await generateTestAccessToken(
      SEED_DATA.SECOND_USER.id,
    );
    const secondUserResult = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByDonorQuery,
      },
      {
        headers: {
          Authorization: `Bearer ${secondUserAccessToken}`,
        },
      },
    );

    assert.equal(
      firstUserResult.data.data.donationsByDonor.length,
      firstUserDonations.length,
    );
    assert.equal(
      firstUserResult.data.data.donationsByDonor[0].fromWalletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
    firstUserResult.data.data.donationsByDonor.forEach(donation => {
      assert.isOk(donation.user.email);
      assert.isOk(donation.user.firstName);
      assert.isOk(donation.user.walletAddress);
    });
    assert.equal(
      firstUserResult.data.data.donationsByDonor[1].fromWalletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
    // second user has no donations
    assert.deepEqual(secondUserResult.data.data.donationsByDonor, []);
  });
  it('should return <<Login Required>> error if user is not signed in', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByDonorQuery,
      },
      {},
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.DONATION_VIEWING_LOGIN_REQUIRED,
    );
  });
}

function donationsToWalletsTestCases() {
  it('should find donations with special destination successfully', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
    });
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      user.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsToWallets,
        variables: {
          toWalletAddresses: [project.walletAddress],
        },
      },
      {},
    );
    // assert.isNotEmpty(result.data.data.donationsToWallets);
    result.data.data.donationsToWallets.forEach(item => {
      assert.equal(item.toWalletAddress, project.walletAddress);
      assert.isOk(item.user.email);
      assert.isOk(item.user.walletAddress);
    });
  });
  it('should find donations with special destination in uppercase successfully', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
    });
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      user.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsToWallets,
        variables: {
          toWalletAddresses: [walletAddress.toUpperCase()],
        },
      },
      {},
    );
    // assert.isNotEmpty(result.data.data.donationsToWallets);
    result.data.data.donationsToWallets.forEach(item => {
      assert.equal(item.toWalletAddress, walletAddress);
    });
  });
  it('should find donations with special destination unsuccessfully', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const walletAddress2 = generateRandomEtheriumAddress();
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: walletAddress2,
    });
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      user.id,
      project2.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsToWallets,
        variables: {
          toWalletAddresses: [walletAddress2],
        },
      },
      {},
    );
    // assert.isNotEmpty(result.data.data.donationsToWallets);
    result.data.data.donationsToWallets.forEach(item => {
      assert.equal(item.toWalletAddress, walletAddress2);
    });
  });
  it('should find no donations with this destination ', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsToWallets,
        variables: {
          toWalletAddresses: [walletAddress],
        },
      },
      {},
    );
    assert.equal(result.data.data.donationsToWallets.length, 0);
  });
}

//
// function updateDonationStatusTestCases() {
//   it('should update donation status to verified after calling without sending status', async () => {
//     // https://blockscout.com/xdai/mainnet/tx/0xaaf96af4d0634dafcac1b6eca627b77ceb157aad1037033761ed3a4220ebb2b5
//     const transactionInfo = {
//       txHash:
//         '0xaaf96af4d0634dafcac1b6eca627b77ceb157aad1037033761ed3a4220ebb2b5',
//       networkId: NETWORK_IDS.XDAI,
//       amount: 1,
//       fromAddress: '0x00d18ca9782be1caef611017c2fbc1a39779a57c',
//       toAddress: '0x90b31c07fb0310b4b0d88368169dad8fe0cbb6da',
//       currency: 'XDAI',
//       timestamp: 1647483910,
//     };
//     const project = await saveProjectDirectlyToDb({
//       ...createProjectData(),
//       walletAddress: transactionInfo.toAddress,
//     });
//     const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
//     const donation = await saveDonationDirectlyToDb(
//       {
//         amount: transactionInfo.amount,
//         transactionNetworkId: transactionInfo.networkId,
//         transactionId: transactionInfo.txHash,
//         currency: transactionInfo.currency,
//         fromWalletAddress: transactionInfo.fromAddress,
//         toWalletAddress: transactionInfo.toAddress,
//         valueUsd: 1,
//         anonymous: false,
//         createdAt: new Date(transactionInfo.timestamp),
//         status: DONATION_STATUS.PENDING,
//       },
//       user.id,
//       project.id,
//     );
//     assert.equal(donation.status, DONATION_STATUS.PENDING);
//     const accessToken = await generateTestAccessToken(user.id);
//     const result = await axios.post(
//       graphqlUrl,
//       {
//         query: updateDonationStatusMutation,
//         variables: {
//           donationId: donation.id,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       },
//     );
//     assert.equal(
//       result.data.data.updateDonationStatus.status,
//       DONATION_STATUS.VERIFIED,
//     );
//   });
//   it('should update donation status to failed after calling without sending status ', async () => {
//     // https://blockscout.com/xdai/mainnet/tx/0x6c2550e21d57d2c9c7e1cb22c0c4d6581575c77f9be2ef35995466e61c730a08
//     const transactionInfo = {
//       txHash:
//         '0x6c2550e21d57d2c9c7e1cb22c0c4d6581575c77f9be2ef35995466e61c730a08',
//       networkId: NETWORK_IDS.XDAI,
//       amount: 1,
//       fromAddress: generateRandomEtheriumAddress(),
//       toAddress: '0x42a7d872dec08d309f4b93d05e5b9de183765858',
//       currency: 'GIV',
//       timestamp: 1647069070,
//     };
//     const project = await saveProjectDirectlyToDb({
//       ...createProjectData(),
//       walletAddress: transactionInfo.toAddress,
//     });
//     const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
//     const donation = await saveDonationDirectlyToDb(
//       {
//         amount: transactionInfo.amount,
//         transactionNetworkId: transactionInfo.networkId,
//         transactionId: transactionInfo.txHash,
//         currency: transactionInfo.currency,
//         fromWalletAddress: transactionInfo.fromAddress,
//         toWalletAddress: transactionInfo.toAddress,
//         valueUsd: 1,
//         anonymous: false,
//         createdAt: new Date(transactionInfo.timestamp),
//         status: DONATION_STATUS.PENDING,
//       },
//       user.id,
//       project.id,
//     );
//     assert.equal(donation.status, DONATION_STATUS.PENDING);
//     const accessToken = await generateTestAccessToken(user.id);
//     const result = await axios.post(
//       graphqlUrl,
//       {
//         query: updateDonationStatusMutation,
//         variables: {
//           donationId: donation.id,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       },
//     );
//     assert.equal(
//       result.data.data.updateDonationStatus.status,
//       DONATION_STATUS.FAILED,
//     );
//     assert.equal(
//       result.data.data.updateDonationStatus.verifyErrorMessage,
//       errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
//     );
//   });
//   // ROPSTEN CHAIN DECOMMISSIONED use goerli
//   // TODO: Rewrite this test with goerli.
//   // it('should update donation status to failed when tx is failed on network ', async () => {
//   //   // https://ropsten.etherscan.io/tx/0x66a7902f3dad318e8d075454e26ee829e9832db0b20922cfd9d916fb792ff724
//   //   const transactionInfo = {
//   //     txHash:
//   //       '0x66a7902f3dad318e8d075454e26ee829e9832db0b20922cfd9d916fb792ff724',
//   //     currency: 'DAI',
//   //     networkId: NETWORK_IDS.ROPSTEN,
//   //     fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
//   //     toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
//   //     amount: 0.04,
//   //     timestamp: 1607360947,
//   //   };
//   //   const project = await saveProjectDirectlyToDb({
//   //     ...createProjectData(),
//   //     walletAddress: transactionInfo.toAddress,
//   //   });
//   //   const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
//   //   const donation = await saveDonationDirectlyToDb(
//   //     {
//   //       amount: transactionInfo.amount,
//   //       transactionNetworkId: transactionInfo.networkId,
//   //       transactionId: transactionInfo.txHash,
//   //       currency: transactionInfo.currency,
//   //       fromWalletAddress: transactionInfo.fromAddress,
//   //       toWalletAddress: transactionInfo.toAddress,
//   //       valueUsd: 1,
//   //       anonymous: false,
//   //       createdAt: new Date(transactionInfo.timestamp),
//   //       status: DONATION_STATUS.PENDING,
//   //     },
//   //     user.id,
//   //     project.id,
//   //   );
//   //   assert.equal(donation.status, DONATION_STATUS.PENDING);
//   //   const accessToken = await generateTestAccessToken(user.id);
//   //   const result = await axios.post(
//   //     graphqlUrl,
//   //     {
//   //       query: updateDonationStatusMutation,
//   //       variables: {
//   //         donationId: donation.id,
//   //         status: DONATION_STATUS.FAILED,
//   //       },
//   //     },
//   //     {
//   //       headers: {
//   //         Authorization: `Bearer ${accessToken}`,
//   //       },
//   //     },
//   //   );
//   //   assert.equal(
//   //     result.data.data.updateDonationStatus.status,
//   //     DONATION_STATUS.FAILED,
//   //   );
//   //   assert.equal(
//   //     result.data.data.updateDonationStatus.verifyErrorMessage,
//   //     errorMessages.TRANSACTION_STATUS_IS_FAILED_IN_NETWORK,
//   //   );
//   // });
//   it('should donation status remain pending after calling without sending status (we assume its not mined so far)', async () => {
//     const transactionInfo = {
//       txHash: generateRandomEvmTxHash(),
//       networkId: NETWORK_IDS.XDAI,
//       amount: 1,
//       fromAddress: generateRandomEtheriumAddress(),
//       toAddress: generateRandomEtheriumAddress(),
//       currency: 'GIV',
//       timestamp: 1647069070,
//     };
//     const project = await saveProjectDirectlyToDb({
//       ...createProjectData(),
//       walletAddress: transactionInfo.toAddress,
//     });
//     const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
//     const donation = await saveDonationDirectlyToDb(
//       {
//         amount: transactionInfo.amount,
//         transactionNetworkId: transactionInfo.networkId,
//         transactionId: transactionInfo.txHash,
//         currency: transactionInfo.currency,
//         fromWalletAddress: transactionInfo.fromAddress,
//         toWalletAddress: transactionInfo.toAddress,
//         valueUsd: 1,
//         nonce: 99999999,
//         anonymous: false,
//         createdAt: new Date(transactionInfo.timestamp),
//         status: DONATION_STATUS.PENDING,
//       },
//       user.id,
//       project.id,
//     );
//     assert.equal(donation.status, DONATION_STATUS.PENDING);
//     const accessToken = await generateTestAccessToken(user.id);
//     const result = await axios.post(
//       graphqlUrl,
//       {
//         query: updateDonationStatusMutation,
//         variables: {
//           donationId: donation.id,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       },
//     );
//     assert.equal(
//       result.data.data.updateDonationStatus.status,
//       DONATION_STATUS.PENDING,
//     );
//   });
//
//   it('should update donation status to verified ', async () => {
//     // https://etherscan.io/tx/0xe42fd848528dcb06f56fd3b553807354b4bf0ff591454e1cc54070684d519df5
//     const transactionInfo = {
//       txHash:
//         '0xe42fd848528dcb06f56fd3b553807354b4bf0ff591454e1cc54070684d519df5',
//       networkId: NETWORK_IDS.MAIN_NET,
//       amount: 500,
//       fromAddress: '0x5d28fe1e9f895464aab52287d85ebff32b351674',
//       toAddress: '0x0eed1566f46b0421d53d2143a3957bb22016ef4b',
//       currency: 'GIV',
//       timestamp: 1646704855,
//     };
//     const project = await saveProjectDirectlyToDb({
//       ...createProjectData(),
//       walletAddress: transactionInfo.toAddress,
//     });
//     const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
//     const donation = await saveDonationDirectlyToDb(
//       {
//         amount: transactionInfo.amount,
//         transactionNetworkId: transactionInfo.networkId,
//         transactionId: transactionInfo.txHash,
//         currency: transactionInfo.currency,
//         fromWalletAddress: transactionInfo.fromAddress,
//         toWalletAddress: transactionInfo.toAddress,
//         valueUsd: 1,
//         anonymous: false,
//         createdAt: new Date(transactionInfo.timestamp),
//         status: DONATION_STATUS.PENDING,
//       },
//       user.id,
//       project.id,
//     );
//     assert.equal(donation.status, DONATION_STATUS.PENDING);
//     const accessToken = await generateTestAccessToken(user.id);
//     const result = await axios.post(
//       graphqlUrl,
//       {
//         query: updateDonationStatusMutation,
//         variables: {
//           donationId: donation.id,
//
//           // We send faild but because it checks with network first, it ignores sent status
//           status: DONATION_STATUS.FAILED,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       },
//     );
//     assert.equal(
//       result.data.data.updateDonationStatus.status,
//       DONATION_STATUS.VERIFIED,
//     );
//   });
//   it('should update donation status to failed', async () => {
//     // https://blockscout.com/xdai/mainnet/tx/0x013c3371c1de181439ac51067fd2e417b71b9d462c13417252e2153f80af630f
//     const transactionInfo = {
//       txHash:
//         '0x013c3371c1de181439ac51067fd2e417b71b9d462c13417252e2153f80af630f',
//       networkId: NETWORK_IDS.XDAI,
//       amount: 2800,
//       fromAddress: '0x5d28fe1e9f895464aab52287d85ebff32b351674',
//       toAddress: generateRandomEtheriumAddress(),
//       currency: 'GIV',
//       timestamp: 1646725075,
//     };
//     const project = await saveProjectDirectlyToDb({
//       ...createProjectData(),
//       walletAddress: transactionInfo.toAddress,
//     });
//     const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
//     const donation = await saveDonationDirectlyToDb(
//       {
//         amount: transactionInfo.amount,
//         transactionNetworkId: transactionInfo.networkId,
//         transactionId: transactionInfo.txHash,
//         currency: transactionInfo.currency,
//         fromWalletAddress: transactionInfo.fromAddress,
//         toWalletAddress: transactionInfo.toAddress,
//         valueUsd: 1,
//         anonymous: false,
//         createdAt: new Date(transactionInfo.timestamp),
//         status: DONATION_STATUS.PENDING,
//       },
//       user.id,
//       project.id,
//     );
//     assert.equal(donation.status, DONATION_STATUS.PENDING);
//     const accessToken = await generateTestAccessToken(user.id);
//     const result = await axios.post(
//       graphqlUrl,
//       {
//         query: updateDonationStatusMutation,
//         variables: {
//           donationId: donation.id,
//           status: DONATION_STATUS.FAILED,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       },
//     );
//     assert.equal(
//       result.data.data.updateDonationStatus.status,
//       DONATION_STATUS.FAILED,
//     );
//     assert.equal(
//       result.data.data.updateDonationStatus.verifyErrorMessage,
//       errorMessages.TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS,
//     );
//   });
//   it('should update donation status to failed, tx is not mined and donor says it failed', async () => {
//     const transactionInfo = {
//       txHash: generateRandomEvmTxHash(),
//       networkId: NETWORK_IDS.XDAI,
//       amount: 1,
//       fromAddress: generateRandomEtheriumAddress(),
//       toAddress: generateRandomEtheriumAddress(),
//       currency: 'GIV',
//       timestamp: 1647069070,
//     };
//     const project = await saveProjectDirectlyToDb({
//       ...createProjectData(),
//       walletAddress: transactionInfo.toAddress,
//     });
//     const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
//     const donation = await saveDonationDirectlyToDb(
//       {
//         amount: transactionInfo.amount,
//         transactionNetworkId: transactionInfo.networkId,
//         transactionId: transactionInfo.txHash,
//         currency: transactionInfo.currency,
//         fromWalletAddress: transactionInfo.fromAddress,
//         toWalletAddress: transactionInfo.toAddress,
//         nonce: 999999,
//         valueUsd: 1,
//         anonymous: false,
//         createdAt: new Date(transactionInfo.timestamp),
//         status: DONATION_STATUS.PENDING,
//       },
//       user.id,
//       project.id,
//     );
//     assert.equal(donation.status, DONATION_STATUS.PENDING);
//     const accessToken = await generateTestAccessToken(user.id);
//     const result = await axios.post(
//       graphqlUrl,
//       {
//         query: updateDonationStatusMutation,
//         variables: {
//           donationId: donation.id,
//           status: DONATION_STATUS.FAILED,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       },
//     );
//     assert.equal(
//       result.data.data.updateDonationStatus.status,
//       DONATION_STATUS.FAILED,
//     );
//     assert.equal(
//       result.data.data.updateDonationStatus.verifyErrorMessage,
//       errorMessages.DONOR_REPORTED_IT_AS_FAILED,
//     );
//   });
// }

async function recentDonationsTestCases() {
  // Clear all other donations

  beforeEach(async () => {
    await Donation.delete({});
  });

  it('should return limited number of recent donations', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const walletAddress2 = generateRandomEtheriumAddress();
    const walletAddress3 = generateRandomEtheriumAddress();
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(walletAddress);
    const user2 = await saveUserDirectlyToDb(walletAddress2);
    const user3 = await saveUserDirectlyToDb(walletAddress3);
    await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: new Date(1000),
      }),
      user.id,
      project.id,
    );

    const donation2 = await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: new Date(2000),
      }),
      user2.id,
      project.id,
    );
    const donation3 = await saveDonationDirectlyToDb(
      createDonationData({
        status: DONATION_STATUS.VERIFIED,
        createdAt: new Date(3000),
      }),
      user3.id,
      project.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchRecentDonations,
        variables: {
          take: 2,
        },
      },
      {},
    );

    assert.isOk(result);

    const { recentDonations } = result.data.data;
    assert.lengthOf(recentDonations, 2);
    assert.equal(recentDonations[0].id, donation3.id);
    assert.equal(recentDonations[1].id, donation2.id);
  });
}

async function donationMetricsTestCases() {
  it('should return correct donation metrics', async () => {
    const walletAddress1 = generateRandomEtheriumAddress();
    const walletAddress2 = generateRandomEtheriumAddress();
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const user1 = await saveUserDirectlyToDb(walletAddress1);
    const user2 = await saveUserDirectlyToDb(walletAddress2);

    // Donations to project with ID 1 (giveth)
    const donation1 = await saveDonationDirectlyToDb(
      {
        ...createDonationData({
          status: DONATION_STATUS.VERIFIED,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          valueUsd: 100,
        }),
        useDonationBox: true,
        relevantDonationTxHash: 'tx1',
        donationPercentage: (100 / 1000) * 100,
      },
      user1.id,
      1, // giveth project id
    );

    const donation2 = await saveDonationDirectlyToDb(
      {
        ...createDonationData({
          status: DONATION_STATUS.VERIFIED,
          createdAt: new Date('2024-01-01T00:00:30Z'),
          valueUsd: 50,
        }),
        useDonationBox: true,
        relevantDonationTxHash: 'tx2',
        donationPercentage: (50 / 250) * 100,
      },
      user1.id,
      1, // giveth project id
    );

    // Donations to another project
    const donation3 = await saveDonationDirectlyToDb(
      {
        ...createDonationData({
          status: DONATION_STATUS.VERIFIED,
          createdAt: new Date('2024-01-01T00:01:00Z'),
          valueUsd: 900,
        }),
        useDonationBox: true,
        transactionId: 'tx1',
      },
      user1.id,
      project2.id,
    );

    const donation4 = await saveDonationDirectlyToDb(
      {
        ...createDonationData({
          status: DONATION_STATUS.VERIFIED,
          createdAt: new Date('2023-01-01T00:01:30Z'),
          valueUsd: 200,
        }),
        useDonationBox: true,
        transactionId: 'tx2',
      },
      user2.id,
      project2.id,
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationMetricsQuery,
        variables: {
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2025-01-02T00:00:00Z',
        },
      },
      {},
    );

    assert.isOk(result);

    const { donationMetrics } = result.data.data;
    assert.equal(donationMetrics.totalDonationsToGiveth, 2);
    assert.equal(donationMetrics.totalUsdValueToGiveth, 150);
    assert.closeTo(donationMetrics.averagePercentageToGiveth, 15, 0.0001);

    // Clean up
    await Donation.remove([donation1, donation2, donation3, donation4]);
    await deleteProjectDirectlyFromDb(project2.id);
    await User.remove([user1, user2]);
  });
}

function qAccLimitTestCases() {
  let project;
  let user;
  let accessToken;
  let earlyAccessRound1;
  beforeEach(async () => {
    project = await saveProjectDirectlyToDb(createProjectData());
    user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    accessToken = await generateTestAccessToken(user.id);
  });
  afterEach(async () => {
    await Donation.delete({ projectId: project.id });
    if (earlyAccessRound1) {
      await ProjectRoundRecord.delete({
        earlyAccessRoundId: earlyAccessRound1.id,
      });
      await earlyAccessRound1.remove();
      earlyAccessRound1 = null;
    }
  });
  it('should create donation in an active early access round', async () => {
    earlyAccessRound1 = await EarlyAccessRound.create({
      roundNumber: generateEARoundNumber(),
      seasonNumber: 1,
      startDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(3, 'days').toDate(),
      roundPOLCapPerProject: 1000000,
      roundPOLCapPerUserPerProject: 50000,
    }).save();

    // send create donation request
    const result: AxiosResponse<ExecutionResult<{ createDonation: number }>> =
      await axios.post(
        graphqlUrl,
        {
          query: createDonationMutation,
          variables: {
            projectId: project.id,
            transactionNetworkId: QACC_NETWORK_ID,
            transactionId: generateRandomEvmTxHash(),
            nonce: 1,
            amount: 10,
            token: QACC_DONATION_TOKEN_SYMBOL,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

    assert.isOk(result.data.data?.createDonation);

    const donationId = result.data.data?.createDonation as number;

    const donation = await Donation.findOneBy({ id: donationId });

    assert.equal(donation?.status, DONATION_STATUS.PENDING);
    assert.equal(donation?.earlyAccessRoundId, earlyAccessRound1.id);
  });

  it('should not associate to round when user limit exceed in an active early access round', async () => {
    const roundPOLCapPerUserPerProject = 50000;
    earlyAccessRound1 = await EarlyAccessRound.create({
      roundNumber: generateEARoundNumber(),
      startDate: new Date(),
      endDate: moment().add(3, 'days').toDate(),
      roundPOLCapPerProject: 1000000,
      roundPOLCapPerUserPerProject,
    }).save();

    const amount = roundPOLCapPerUserPerProject + 1;
    // send create donation request
    const result: AxiosResponse<ExecutionResult<{ createDonation: number }>> =
      await axios.post(
        graphqlUrl,
        {
          query: createDonationMutation,
          variables: {
            projectId: project.id,
            transactionNetworkId: QACC_NETWORK_ID,
            transactionId: generateRandomEvmTxHash(),
            nonce: 1,
            amount: amount,
            token: QACC_DONATION_TOKEN_SYMBOL,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

    assert.isOk(result);
    const donationId = result.data.data?.createDonation as number;

    const donation = await Donation.findOneBy({ id: donationId });

    assert.isNotOk(donation?.earlyAccessRoundId);
    assert.isNotOk(donation?.qfRound);
    assert.isNotOk(donation?.earlyAccessRoundId);
    assert.isNotOk(donation?.qfRoundId);

    // const errors = donationsResponse.data.errors as GraphQLError[];
    // assert.isNotEmpty(errors);
    // assert.equal(errors[0]!.message, errorMessages.EXCEED_QACC_CAP);
  });
}

function qAccCapChangeTestCases() {
  let ea;
  beforeEach(async () => {
    ea = await EarlyAccessRound.create({
      roundNumber: generateEARoundNumber(),
      startDate: moment().subtract(1, 'days').toDate(),
      endDate: moment().add(3, 'days').toDate(),
      roundPOLCapPerProject: 1000000,
      roundPOLCapPerUserPerProject: 50000,
    }).save();
    sinon
      .stub(qAccService, 'getQAccDonationCap')
      .resolves(Number.MAX_SAFE_INTEGER);
  });

  afterEach(async () => {
    sinon.restore();
    if (ea) {
      await ProjectRoundRecord.delete({});
      await ProjectUserRecord.delete({});
      await Donation.delete({ earlyAccessRoundId: ea.id });
      await EarlyAccessRound.delete({});
      ea = null;
    }
  });

  it('should update projectUserRecord and projectRoundRecord when donation is created', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);

    const donationAmount = 100;

    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: QACC_NETWORK_ID,
          transactionId: generateRandomEvmTxHash(),
          nonce: 1,
          amount: donationAmount,
          token: QACC_DONATION_TOKEN_SYMBOL,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDonation,
      },
    });

    assert.equal(donation?.status, DONATION_STATUS.PENDING);
    assert.equal(donation?.earlyAccessRoundId, ea.id);

    const projectUserRecord = await ProjectUserRecord.findOneBy({
      projectId: project.id,
      userId: user.id,
    });

    assert.isOk(projectUserRecord);
    assert.equal(projectUserRecord?.totalDonationAmount, donationAmount);

    const projectRoundRecord = await ProjectRoundRecord.findOneBy({
      projectId: project.id,
      earlyAccessRoundId: ea.id,
    });

    assert.isOk(projectRoundRecord);
    assert.equal(projectRoundRecord?.totalDonationAmount, donationAmount);
  });
}
