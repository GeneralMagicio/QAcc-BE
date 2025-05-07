import axios from 'axios';
import { TokenPriceHistory } from '../entities/tokenPriceHistory';
import { logger } from '../utils/logger';
import { QACC_DONATION_TOKEN_ADDRESS } from '../constants/qacc';
import { Project } from '../entities/project';

interface GeckoTerminalResponse {
  data: {
    attributes: {
      price_usd: string;
      fdv_usd: string | null;
    };
  };
}

export class TokenPriceService {
  private static readonly GECKO_TERMINAL_BASE_URL =
    'https://api.geckoterminal.com/api/v2/networks/polygon_pos/tokens';

  static async fetchTokenPrice(tokenAddress: string): Promise<{
    price: number;
    priceUSD: number;
    marketCap: number | null;
  } | null> {
    try {
      const response = await axios.get<GeckoTerminalResponse>(
        `${this.GECKO_TERMINAL_BASE_URL}/${tokenAddress.toLowerCase()}/`,
      );

      const priceUSD = parseFloat(response.data.data.attributes.price_usd);
      if (isNaN(priceUSD) || priceUSD === 0) {
        return null;
      }

      // Calculate token price in POL by dividing USD price by POL price
      const polResponse = await axios.get<GeckoTerminalResponse>(
        `${this.GECKO_TERMINAL_BASE_URL}/${QACC_DONATION_TOKEN_ADDRESS}/`,
      );
      const polPriceUSD = parseFloat(
        polResponse.data.data.attributes.price_usd,
      );

      if (isNaN(polPriceUSD) || polPriceUSD === 0) {
        return null;
      }

      const marketCap = response.data.data.attributes.fdv_usd
        ? parseFloat(response.data.data.attributes.fdv_usd)
        : null;

      return {
        price: priceUSD / polPriceUSD, // Price in terms of POL tokens
        priceUSD,
        marketCap,
      };
    } catch (error) {
      logger.error('Error fetching token price from GeckoTerminal', {
        tokenAddress,
        error: error.message,
      });
      return null;
    }
  }

  static async updateTokenPrices(): Promise<void> {
    try {
      // Get all tokens from the database
      const projects = await Project.find();
      const tokens = projects.flatMap(project => {
        const tokenAddress = project.abc.issuanceTokenAddress;
        const tokenTicker = project.abc.tokenTicker;
        return { tokenAddress, tokenTicker };
      });

      for (const token of tokens) {
        const priceData = await this.fetchTokenPrice(token.tokenAddress);

        if (priceData) {
          // Create new price history entry
          const priceHistory = new TokenPriceHistory();
          priceHistory.token = token.tokenTicker;
          priceHistory.tokenAddress = token.tokenAddress.toLowerCase();
          priceHistory.price = priceData.price;
          priceHistory.priceUSD = priceData.priceUSD;
          priceHistory.marketCap = priceData.marketCap ?? 0;

          await priceHistory.save();
          logger.info('Token price updated successfully', {
            tokenTicker: token.tokenTicker,
            tokenAddress: token.tokenAddress,
            price: priceData.price,
            marketCap: priceData.marketCap,
          });
        } else {
          logger.info('Skipping token as no price data available', {
            token,
          });
        }
      }
    } catch (error) {
      logger.error('Error updating token prices', {
        error: error.message,
      });
    }
  }
}
