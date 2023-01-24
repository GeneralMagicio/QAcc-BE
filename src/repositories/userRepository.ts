import { publicSelectionFields, User, UserRole } from '../entities/user';
import { SegmentAnalyticsSingleton } from '../services/segment/segmentAnalyticsSingleton';
import { Donation } from '../entities/donation';
import { Reaction } from '../entities/reaction';
import { PowerBoosting } from '../entities/powerBoosting';

export const findAdminUserByEmail = async (
  email: string,
): Promise<User | undefined> => {
  return User.createQueryBuilder()
    .where(`email = :email`, { email })
    .andWhere(`role != '${UserRole.RESTRICTED}'`)
    .getOne();
};

export const findUserByWalletAddress = async (
  walletAddress: string,
  includeSensitiveFields = true,
): Promise<User | undefined> => {
  const query = User.createQueryBuilder('user').where(
    `LOWER("walletAddress") = :walletAddress`,
    {
      walletAddress: walletAddress.toLowerCase(),
    },
  );
  if (!includeSensitiveFields) {
    query.select(publicSelectionFields);
  }

  return query.getOne();
};

export const findUserById = (userId: number): Promise<User | undefined> => {
  return User.findOne({ id: userId });
};

export const findAllUsers = async (params: {
  take: number;
  skip: number;
}): Promise<{ users: User[]; count: number }> => {
  const [users, count] = await User.createQueryBuilder('user')
    .take(params.take)
    .skip(params.skip)
    .getManyAndCount();
  return { users, count };
};

export const createUserWithPublicAddress = async (
  walletAddress: string,
): Promise<User> => {
  const user = await User.create({
    walletAddress: walletAddress.toLowerCase(),
    loginType: 'wallet',
    segmentIdentified: true,
  }).save();

  SegmentAnalyticsSingleton.getInstance().identifyUser(user);

  return user;
};

export const findUsersWhoBoostedProject = async (
  projectId: number,
): Promise<{ walletAddress: string; email?: string }[]> => {
  return PowerBoosting.createQueryBuilder('powerBoosting')
    .leftJoin('powerBoosting.user', 'user')
    .leftJoinAndSelect('powerBoosting.project', 'project')
    .leftJoinAndSelect(
      User,
      'projectOwner',
      'project.adminUserId = projectOwner.id',
    )
    .select('LOWER(user.walletAddress) AS "walletAddress", user.email as email')
    .where(`"projectId"=:projectId`, {
      projectId,
    })
    .andWhere(`percentage > 0`)
    .andWhere(`user.id != projectOwner.id`)
    .getRawMany();
};

export const findUsersWhoLikedProjectExcludeProjectOwner = async (
  projectId: number,
): Promise<{ walletAddress: string; email?: string }[]> => {
  return Reaction.createQueryBuilder('reaction')
    .leftJoin(User, 'user', 'reaction.userId = user.id')
    .leftJoinAndSelect('reaction.project', 'project')
    .leftJoinAndSelect(
      User,
      'projectOwner',
      'project.adminUserId = projectOwner.id',
    )
    .select(
      'LOWER(user.walletAddress) AS "walletAddress", user.email as email, projectOwner.id as ownerId',
    )
    .where(`"projectId"=:projectId`, {
      projectId,
    })
    .andWhere(`user.id != projectOwner.id`)
    .getRawMany();
};

export const findUsersWhoDonatedToProjectExcludeWhoLiked = async (
  projectId: number,
): Promise<{ walletAddress: string; email?: string }[]> => {
  return Donation.createQueryBuilder('donation')
    .leftJoinAndSelect('donation.project', 'project')
    .leftJoinAndSelect(
      User,
      'projectOwner',
      'project.adminUserId = projectOwner.id',
    )
    .leftJoin('donation.user', 'user')
    .leftJoin(
      Reaction,
      'reaction',
      'reaction.projectId = project.id AND user.id = reaction.userId',
    )
    .distinctOn(['user.walletAddress'])
    .select('LOWER(user.walletAddress) AS "walletAddress", user.email as email')
    .where(`donation."projectId"=:projectId`, {
      projectId,
    })
    .andWhere(`reaction.id IS NULL`)
    .andWhere(`user.id != projectOwner.id`)
    .getRawMany();
};

export const findUsersWhoSupportProject = async (
  projectId: number,
): Promise<{ walletAddress: string; email?: string }[]> => {
  const [usersWhoBoosted, usersWhoLiked, usersWhoDonated] = await Promise.all([
    findUsersWhoBoostedProject(projectId),
    findUsersWhoLikedProjectExcludeProjectOwner(projectId),
    findUsersWhoDonatedToProjectExcludeWhoLiked(projectId),
  ]);

  const users: { walletAddress: string; email?: string }[] = [];
  for (const user of usersWhoDonated
    .concat(usersWhoLiked)
    .concat(usersWhoBoosted)) {
    // Make sure we dont add repetitive users
    if (!users.find(u => u.walletAddress === user.walletAddress)) {
      users.push(user);
    }
  }
  return users;
};
