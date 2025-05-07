import cron from 'node-cron';
import { TokenPriceService } from '../tokenPriceService';
import { logger } from '../../utils/logger';

// Run every hour
const CRON_SCHEDULE = '0 * * * *';

export const startTokenPriceCron = () => {
  logger.info('Starting token price cron job');

  cron.schedule(CRON_SCHEDULE, async () => {
    logger.info('Running token price update cron job');
    try {
      await TokenPriceService.updateTokenPrices();
      logger.info('Token price update cron job completed successfully');
    } catch (error) {
      logger.error('Error in token price update cron job', {
        error: error.message,
      });
    }
  });
};
