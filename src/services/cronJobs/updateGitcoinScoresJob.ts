import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import { User } from '../../entities/user';
import { updateUserGitcoinScores } from '../userService';
import {
  GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE,
  GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE,
} from '../../constants/gitcoin';

const cronJobTime =
  (config.get('UPDATE_GITCOIN_SCORES_CRONJOB_EXPRESSION') as string) ||
  '0 */6 * * *'; // Run every 6 hours by default

export const runUpdateGitcoinScoresJob = () => {
  logger.debug(
    'runUpdateGitcoinScoresJob() has been called, cronJobTime',
    cronJobTime,
  );

  schedule(cronJobTime, async () => {
    try {
      // Find users who skipped verification and have insufficient scores
      const users = await User.createQueryBuilder('user')
        .where('user.skipVerification = :skipVerification', {
          skipVerification: true,
        })
        .andWhere(
          '(user.analysisScore < :minAnalysisScore OR user.passportScore < :minPassportScore)',
          {
            minAnalysisScore: GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE,
            minPassportScore: GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE,
          },
        )
        .getMany();

      logger.debug(`Found ${users.length} users to update Gitcoin scores`);

      // Update scores for each user
      for (const user of users) {
        try {
          await updateUserGitcoinScores(user);
          logger.debug(
            `Successfully updated Gitcoin scores for user ${user.id}`,
          );
        } catch (error) {
          logger.error(
            `Failed to update Gitcoin scores for user ${user.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      logger.error('Error in updateGitcoinScoresJob:', error);
    }
  });
};
