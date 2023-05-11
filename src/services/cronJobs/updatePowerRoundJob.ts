import config from '../../config';
import { logger } from '../../utils/logger';
import { schedule } from 'node-cron';
import {
  getPowerRound,
  setPowerRound,
} from '../../repositories/powerRoundRepository';
import { getRoundNumberByDate } from '../../utils/powerBoostingUtils';
import {
  refreshProjectPowerView,
  refreshProjectFuturePowerView,
  getBottomRank,
} from '../../repositories/projectPowerViewRepository';
import { refreshUserProjectPowerView } from '../../repositories/userProjectPowerViewRepository';
import {
  copyProjectRanksToPreviousRoundRankTable,
  deleteAllPreviousRoundRanks,
  projectsThatTheirRanksHaveChanged,
} from '../../repositories/previousRoundRankRepository';
import { getNotificationAdapter } from '../../adapters/adaptersFactory';

const cronJobTime =
  (config.get('UPDATE_POWER_ROUND_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * *';

export const runUpdatePowerRoundCronJob = () => {
  logger.debug(
    'runUpdatePowerRoundCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    const currentRound = await getPowerRound();
    const powerRound = getRoundNumberByDate(new Date()).round - 1;
    logger.debug('runUpdatePowerRoundCronJob', {
      powerRound,
      currentRound,
      'powerRound !== currentRound?.round': powerRound !== currentRound?.round,
    });
    let oldBottomRank;
    if (powerRound !== currentRound?.round) {
      logger.debug(
        'runUpdatePowerRoundCronJob copy rounds to previousRoundRank',
      );
      await copyProjectRanksToPreviousRoundRankTable();
      await setPowerRound(powerRound);
      oldBottomRank = await getBottomRank();
    }
    await Promise.all([
      refreshProjectPowerView(),
      refreshProjectFuturePowerView(),
      refreshUserProjectPowerView(),
    ]);
    if (powerRound !== currentRound?.round) {
      const projectThatTheirRankChanged =
        await projectsThatTheirRanksHaveChanged();
      logger.debug(
        'runUpdatePowerRoundCronJob projectThatTheirRankChanged',
        projectThatTheirRankChanged,
      );
      const newBottomRank = await getBottomRank();
      await getNotificationAdapter().projectsHaveNewRank({
        oldBottomRank,
        newBottomRank,
        projectRanks: projectThatTheirRankChanged,
      });
    }
  });
};
