import {
  Arg,
  Ctx,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from 'type-graphql';
import { Brackets, MoreThanOrEqual, Repository } from 'typeorm';

import moment from 'moment';
import { User, UserOrderField } from '../entities/user';
import { AccountVerificationInput } from './types/accountVerificationInput';
import { ApolloContext } from '../types/ApolloContext';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { validateEmail } from '../utils/validators/commonValidators';
import {
  findUserById,
  findUserByWalletAddress,
  updateUserEmailConfirmationStatus,
  getUserEmailConfirmationFields,
} from '../repositories/userRepository';
import { createNewAccountVerification } from '../repositories/accountVerificationRepository';
import { UserByAddressResponse } from './types/userResolver';
import { AppDataSource } from '../orm';
import {
  getGitcoinAdapter,
  getNotificationAdapter,
  privadoAdapter,
} from '../adapters/adaptersFactory';
import { logger } from '../utils/logger';
import { isWalletAddressInPurpleList } from '../repositories/projectAddressRepository';
import { addressHasDonated } from '../repositories/donationRepository';
// import { getOrttoPersonAttributes } from '../adapters/notifications/NotificationCenterAdapter';
import { retrieveActiveQfRoundUserMBDScore } from '../repositories/qfRoundRepository';
import { PrivadoAdapter } from '../adapters/privado/privadoAdapter';
import {
  GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE,
  GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE,
} from '../constants/gitcoin';
import { UserRankMaterializedView } from '../entities/userRanksMaterialized';
import { DONATION_STATUS } from '../entities/donation';

@ObjectType()
class UserRelatedAddressResponse {
  @Field(_type => Boolean, { nullable: false })
  hasRelatedProject: boolean;

  @Field(_type => Boolean, { nullable: false })
  hasDonated: boolean;
}

export enum UserKycType {
  zkId = 'zkId',
  GTCPass = 'GTCPass',
}

enum UserSortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(UserKycType, {
  name: 'UserKycType',
  description: 'User KYC type either Privado zk ID or Gitcoin Passport',
});

registerEnumType(UserOrderField, {
  name: 'UserOrderField',
  description: 'Sort by field',
});

registerEnumType(UserSortDirection, {
  name: 'UserSortDirection',
  description: 'Sort direction',
});

@InputType()
class SortUserBy {
  @Field(_type => UserOrderField)
  field: UserOrderField;

  @Field(_type => UserSortDirection)
  direction: UserSortDirection;
}

@ObjectType()
class EligibleUser {
  @Field(_type => String, { nullable: false })
  address: string;

  @Field(_type => UserKycType, { nullable: false })
  kycType: UserKycType;
}

@ObjectType()
class BatchMintingEligibleUserResponse {
  @Field(_addresses => [String], { nullable: false })
  users: string[];

  @Field(_total => Number, { nullable: false })
  total: number;

  @Field(_offset => Number, { nullable: false })
  skip: number;
}
@ObjectType()
class BatchMintingEligibleUserV2Response {
  @Field(_addresses => [EligibleUser], { nullable: false })
  users: EligibleUser[];

  @Field(_total => Number, { nullable: false })
  total: number;

  @Field(_offset => Number, { nullable: false })
  skip: number;
}

@ObjectType()
class PaginatedUsers {
  @Field(_type => [User], { nullable: true })
  users: User[];

  @Field(_type => Number, { nullable: true })
  totalCount: number;
}

@ObjectType()
class UsersData {
  @Field(_type => [User], { nullable: true })
  users: User[];

  @Field(_type => Number, { nullable: true })
  totalCount: number;
}

// eslint-disable-next-line unused-imports/no-unused-imports
@Resolver(_of => User)
export class UserResolver {
  constructor(private readonly userRepository: Repository<User>) {
    this.userRepository = AppDataSource.getDataSource().getRepository(User);
  }

  // async create(@Arg('data', () => RegisterInput) data: any) {
  // return User.create(data).save();
  // }

  @Query(_returns => UserRelatedAddressResponse)
  async walletAddressUsed(@Arg('address') address: string) {
    return {
      hasRelatedProject: await isWalletAddressInPurpleList(address),
      hasDonated: await addressHasDonated(address),
    };
  }

  @Query(_returns => UserByAddressResponse, { nullable: true })
  async userByAddress(
    @Arg('address', _type => String) address: string,
    @Ctx() { req: { user } }: ApolloContext,
  ) {
    const includeSensitiveFields =
      user?.walletAddress?.toLowerCase() === address.toLowerCase();
    const foundUser = await findUserByWalletAddress(
      address,
      includeSensitiveFields,
    );
    if (!foundUser) {
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
    }
    return {
      isSignedIn: Boolean(user),
      ...foundUser,
    };
  }

  @Query(_returns => User, { nullable: true })
  async refreshUserScores(
    @Arg('address', _type => String) address: string,
    @Ctx() { req: { user } }: ApolloContext,
  ) {
    const includeSensitiveFields =
      user?.walletAddress?.toLowerCase() === address.toLowerCase();
    const foundUser = await findUserByWalletAddress(
      address,
      includeSensitiveFields,
    );

    if (!foundUser) return;

    try {
      // Refresh user score
      await getGitcoinAdapter().submitPassport({
        address,
      });

      const passportScore =
        await getGitcoinAdapter().getWalletAddressScore(address);

      const passportStamps =
        await getGitcoinAdapter().getPassportStamps(address);

      const analysisScore =
        await getGitcoinAdapter().getUserAnalysisScore(address);

      if (passportScore && passportScore?.score) {
        const score = Number(passportScore.score);
        foundUser.passportScore = score;
        foundUser.passportScoreUpdateTimestamp = new Date();
      }
      if (passportStamps)
        foundUser.passportStamps = passportStamps.items.length;

      const activeQFMBDScore = await retrieveActiveQfRoundUserMBDScore(
        foundUser.id,
      );
      if (activeQFMBDScore) {
        foundUser.activeQFMBDScore = activeQFMBDScore;
      }
      foundUser.analysisScore = analysisScore;
      await foundUser.save();
    } catch (e) {
      logger.error(`refreshUserScores Error with address ${address}: `, e);
    }

    return foundUser;
  }

  @Query(_returns => BatchMintingEligibleUserResponse)
  async batchMintingEligibleUsers(
    @Arg('limit', _type => Int, { nullable: true }) limit: number = 1000,
    @Arg('skip', _type => Int, { nullable: true }) skip: number = 0,
    @Arg('filterAddress', { nullable: true }) filterAddress: string,
  ) {
    let query = User.createQueryBuilder('user')
      .select('user.walletAddress')
      .where('user.acceptedToS = true')
      .andWhere(':privadoRequestId = ANY (user.privadoVerifiedRequestIds)', {
        privadoRequestId: PrivadoAdapter.privadoRequestId,
      });
    if (filterAddress) {
      query = query.andWhere(`LOWER("walletAddress") = :walletAddress`, {
        walletAddress: filterAddress.toLowerCase(),
      });
    }

    const response = await query
      .orderBy('user.acceptedToSDate', 'ASC')
      .take(limit)
      .skip(skip)
      .getManyAndCount();

    return {
      users: response[0].map((user: User) => user.walletAddress),
      total: response[1],
      skip,
    };
  }

  @Query(_returns => BatchMintingEligibleUserV2Response)
  async batchMintingEligibleUsersV2(
    @Arg('limit', _type => Int, { nullable: true }) limit: number = 1000,
    @Arg('skip', _type => Int, { nullable: true }) skip: number = 0,
    @Arg('filterAddress', { nullable: true }) filterAddress: string,
  ) {
    let query = User.createQueryBuilder('user')
      .select('user.walletAddress', 'address')
      .addSelect(
        'CASE WHEN :privadoRequestId = ANY (user.privadoVerifiedRequestIds) THEN :zkId ELSE :GTCPass END',
        'kycType',
      )
      .setParameters({
        privadoRequestId: PrivadoAdapter.privadoRequestId,
        zkId: UserKycType.zkId,
        GTCPass: UserKycType.GTCPass,
      })
      .where('user.acceptedToS = true')
      .andWhere(
        new Brackets(qb => {
          qb.where('user.analysisScore >= :minAnalysisScore', {
            minAnalysisScore: GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE,
          })
            .orWhere('user.passportScore >= :minPassportScore', {
              minPassportScore: GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE,
            })
            .orWhere(
              ':privadoRequestId = ANY (user.privadoVerifiedRequestIds)',
              {
                privadoRequestId: PrivadoAdapter.privadoRequestId,
              },
            )
            .orWhere('user.skipVerification = :skipVerification', {
              skipVerification: true,
            });
        }),
      );

    if (filterAddress) {
      query = query.andWhere(`LOWER("walletAddress") = :walletAddress`, {
        walletAddress: filterAddress.toLowerCase(),
      });
    }

    const count = await query.getCount();
    const response = await query
      .orderBy('user.acceptedToSDate', 'ASC')
      .take(limit)
      .skip(skip)
      .getRawMany();

    return {
      users: response,
      total: count,
      skip,
    };
  }

  @Query(_returns => PaginatedUsers)
  async getUsersByQaccPoints(
    @Arg('take', _type => Int, { defaultValue: 15 }) take: number,
    @Arg('skip', _type => Int, { defaultValue: 0 }) skip: number,
    @Arg('orderBy', _type => SortUserBy, {
      defaultValue: {
        field: UserOrderField.QaccPoints,
        direction: UserSortDirection.DESC,
      },
    })
    orderBy: SortUserBy,
    @Arg('walletAddress', _type => String, { nullable: true })
    walletAddress?: string,
  ) {
    const whereCondition: any = { qaccPoints: MoreThanOrEqual(1) };
    if (walletAddress) {
      whereCondition.walletAddress = walletAddress;
    }
    const [users, totalCount] = await UserRankMaterializedView.findAndCount({
      where: whereCondition,
      order: { [orderBy.field]: orderBy.direction },
      take,
      skip,
    });

    return { users, totalCount };
  }

  @Mutation(_returns => Boolean)
  async updateUser(
    @Arg('fullName', { nullable: true }) fullName: string,
    @Arg('location', { nullable: true }) location: string,
    @Arg('email', { nullable: true }) email: string,
    @Arg('url', { nullable: true }) url: string,
    @Arg('avatar', { nullable: true }) avatar: string,
    // @Arg('newUser', { nullable: true }) newUser: boolean,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );
    const dbUser = await findUserById(user.userId);
    if (!dbUser) {
      return false;
    }

    if (!fullName || fullName === '') {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.FULL_NAME_CAN_NOT_BE_EMPTY),
      );
    }
    dbUser.name = fullName.trim();
    const [first, ...rest] = fullName.split(' ');
    dbUser.firstName = first;
    dbUser.lastName = rest.join(' ') || '';

    // Update other fields
    if (location !== undefined) {
      dbUser.location = location;
    }
    if (email !== undefined) {
      // User can unset his email by putting empty string
      if (!validateEmail(email)) {
        throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_EMAIL));
      }
      if (dbUser.email !== email) {
        await updateUserEmailConfirmationStatus({
          userId: dbUser.id,
          emailConfirmed: false,
          emailConfirmedAt: null,
          emailVerificationCodeExpiredAt: null,
          emailVerificationCode: null,
          emailConfirmationSent: false,
          emailConfirmationSentAt: null,
        });
        dbUser.emailConfirmed = false;
        dbUser.emailConfirmedAt = null;
        dbUser.emailConfirmationSent = false;
        dbUser.emailConfirmationSentAt = null;
        dbUser.email = email;
      }
    }
    if (url !== undefined) {
      dbUser.url = url;
    }
    if (avatar !== undefined) {
      dbUser.avatar = avatar;
    }

    await dbUser.save();

    // const orttoPerson = getOrttoPersonAttributes({
    //   firstName: dbUser.firstName,
    //   lastName: dbUser.lastName,
    //   email: dbUser.email,
    //   userId: dbUser.id.toString(),
    // });
    // await getNotificationAdapter().updateOrttoPeople([orttoPerson]);
    // if (newUser) {
    //   await getNotificationAdapter().createOrttoProfile(dbUser);
    // }

    return true;
  }

  // Sets the current account verification and creates related verifications
  @Mutation(_returns => Boolean)
  async addUserVerification(
    @Arg('dId', { nullable: true }) dId: string,
    @Arg('verifications', _type => [AccountVerificationInput])
    verificationsInput: AccountVerificationInput[],
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const currentUser = await findUserById(user.userId);
    if (!currentUser)
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));

    currentUser.dId = dId;
    await currentUser.save();

    const associatedVerifications = verificationsInput.map(verification => {
      return { ...verification, user: currentUser, dId };
    });

    // I don't know wether we use this mutation or not, maybe it's useless
    await createNewAccountVerification(associatedVerifications);

    return true;
  }

  @Mutation(_returns => User)
  async userVerificationSendEmailConfirmation(
    @Arg('userId') userId: number,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<User> {
    try {
      const currentUserId = user?.userId;
      if (!currentUserId || currentUserId != userId) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }

      const userToVerify = await findUserById(userId);

      if (!userToVerify) {
        throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
      }

      const email = userToVerify.email;
      if (!email) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.NO_EMAIL_PROVIDED),
        );
      }
      if (userToVerify.emailConfirmed) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.YOU_ALREADY_VERIFIED_THIS_EMAIL),
        );
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const emailVerificationCodeExpiredAt = moment()
        .add(30, 'minutes')
        .toDate();

      await updateUserEmailConfirmationStatus({
        userId: userToVerify.id,
        emailConfirmed: false,
        emailConfirmedAt: null,
        emailVerificationCodeExpiredAt,
        emailVerificationCode: code,
        emailConfirmationSent: true,
        emailConfirmationSentAt: new Date(),
      });

      const updatedUser = await findUserById(userId);

      if (!updatedUser) {
        throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
      }

      await getNotificationAdapter().sendUserEmailConfirmation({
        email,
        code,
      });

      return updatedUser;
    } catch (e) {
      logger.error('userVerificationSendEmailConfirmation() error', e);
      throw e;
    }
  }

  @Mutation(_returns => User)
  async userVerificationConfirmEmail(
    @Arg('userId') userId: number,
    @Arg('emailConfirmationCode') emailConfirmationCode: string,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<User> {
    try {
      const currentUserId = user?.userId;
      if (!currentUserId || currentUserId !== userId) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }

      const userFromDB = await findUserById(userId);

      if (!userFromDB) {
        throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
      }

      const emailConfirmationFields = await getUserEmailConfirmationFields(
        userFromDB.id,
      );

      if (!emailConfirmationFields) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.NO_EMAIL_VERIFICATION_DATA),
        );
      }

      if (
        emailConfirmationCode !== emailConfirmationFields.emailVerificationCode
      ) {
        throw new Error(i18n.__(translationErrorMessagesKeys.INCORRECT_CODE));
      }

      const currentTime = new Date();
      if (
        emailConfirmationFields.emailVerificationCodeExpiredAt &&
        emailConfirmationFields.emailVerificationCodeExpiredAt < currentTime
      ) {
        throw new Error(i18n.__(translationErrorMessagesKeys.CODE_EXPIRED));
      }

      await updateUserEmailConfirmationStatus({
        userId: userFromDB.id,
        emailConfirmed: true,
        emailConfirmedAt: new Date(),
        emailVerificationCodeExpiredAt: null,
        emailVerificationCode: null,
        emailConfirmationSent: false,
        emailConfirmationSentAt: null,
      });

      const updatedUser = await findUserById(userId);

      if (!updatedUser) {
        throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
      }

      return updatedUser;
    } catch (e) {
      logger.error('userVerificationConfirmEmail() error', e);
      throw e;
    }
  }

  @Mutation(_returns => Boolean)
  async checkUserPrivadoVerifiedState(
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );
    return await privadoAdapter.checkUserVerified(user.userId);
  }

  @Mutation(_returns => Boolean)
  async acceptedTermsOfService(
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const userFromDB = await findUserById(user.userId);

    if (userFromDB && !userFromDB.acceptedToS) {
      userFromDB.acceptedToS = true;
      userFromDB.acceptedToSDate = new Date();
      await userFromDB.save();
      return true;
    }
    return false;
  }

  @Mutation(_returns => Boolean)
  async setSkipVerification(
    @Arg('skipVerification', _type => Boolean) skipVerification: boolean,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const userFromDB = await findUserById(user.userId);
    if (!userFromDB) {
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
    }

    userFromDB.skipVerification = skipVerification;
    await userFromDB.save();
    return true;
  }

  @Query(_returns => UsersData)
  async getUsersVerificationStatus(
    @Arg('hasDonated', () => Boolean, { nullable: true }) hasDonated?: boolean,
    @Arg('privadoVerified', () => Boolean, { nullable: true })
    privadoVerified?: boolean,
    @Arg('humanVerified', () => Boolean, { nullable: true })
    humanVerified?: boolean,
  ) {
    const query = User.createQueryBuilder('user').select([
      'user.id',
      'user.walletAddress',
      'user.passportScore',
      'user.passportStamps',
      'user.privadoVerifiedRequestIds',
      'user.skipVerification',
    ]);
    if (hasDonated) {
      query.andWhere(
        `EXISTS (
            SELECT 1 FROM donation d
            WHERE d."userId" = user.id AND d.status = :status
          )`,
        { status: DONATION_STATUS.VERIFIED },
      );
    }

    if (privadoVerified === true) {
      // Add the filter for users who are privado verified
      query.andWhere(
        ':privadoRequestId = ANY (user.privadoVerifiedRequestIds)',
        {
          privadoRequestId: PrivadoAdapter.privadoRequestId,
        },
      );
    }

    if (humanVerified === true) {
      query
        .andWhere(
          new Brackets(qb => {
            qb.where('user.passportScore >= :passportScoreThreshold', {
              passportScoreThreshold: GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE,
            }).orWhere('user.analysisScore >= :analysisScoreThreshold', {
              analysisScoreThreshold: GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE,
            });
          }),
        )
        .andWhere(
          'NOT (:privadoRequestId = ANY (user.privadoVerifiedRequestIds))',
          { privadoRequestId: PrivadoAdapter.privadoRequestId },
        ); // Negate the condition for privadoVerified
    }

    const [users, totalCount] = await query.getManyAndCount();

    return {
      users: users,
      totalCount: totalCount,
    };
  }
}
