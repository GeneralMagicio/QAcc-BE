import { Resolver, Query, Arg } from 'type-graphql';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { TokenPriceHistory } from '../entities/tokenPriceHistory';
import { logger } from '../utils/logger';

@Resolver(_of => TokenPriceHistory)
export class TokenPriceResolver {
  @Query(_returns => [TokenPriceHistory])
  async getTokenPriceHistory(
    @Arg('tokenAddress') tokenAddress: string,
    @Arg('startTime', { nullable: true })
    startTime?: Date,
    @Arg('endTime', { nullable: true })
    endTime?: Date,
  ): Promise<TokenPriceHistory[]> {
    try {
      const where: any = {
        tokenAddress: tokenAddress.toLowerCase(),
      };

      if (startTime && endTime) {
        where.timestamp = Between(startTime, endTime);
      } else if (startTime) {
        where.timestamp = MoreThanOrEqual(startTime);
      } else if (endTime) {
        where.timestamp = LessThanOrEqual(endTime);
      }

      return await TokenPriceHistory.find({
        where,
        order: { timestamp: 'DESC' },
      });
    } catch (error) {
      logger.error('Error fetching token price history', {
        tokenAddress,
        error: error.message,
      });
      throw error;
    }
  }

  @Query(_returns => [TokenPriceHistory])
  async getTokenMarketCapChanges24h(
    @Arg('tokenAddress') tokenAddress: string,
  ): Promise<TokenPriceHistory[]> {
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const priceHistory = await TokenPriceHistory.find({
        where: {
          tokenAddress: tokenAddress.toLowerCase(),
          timestamp: Between(twentyFourHoursAgo, now),
        },
        order: { timestamp: 'DESC' },
      });

      return priceHistory;
    } catch (error) {
      logger.error('Error fetching 24h market cap changes', {
        tokenAddress,
        error: error.message,
      });
      throw error;
    }
  }
}
