import { assert } from 'chai';
import axios from 'axios';
import {
  graphqlUrl,
  generateRandomEtheriumAddress,
} from '../../test/testUtils';
import { TokenPriceHistory } from '../entities/tokenPriceHistory';
import { AppDataSource } from '../orm';
import {
  getTokenPriceHistoryQuery,
  getTokenMarketCapChanges24hQuery,
} from '../../test/graphqlQueries';

describe('TokenPriceResolver test cases', () => {
  describe('getTokenPriceHistory() test cases', getTokenPriceHistoryTestCases);
  describe(
    'getTokenMarketCapChanges24h() test cases',
    getTokenMarketCapChanges24hTestCases,
  );
});

function getTokenPriceHistoryTestCases() {
  let tokenAddress: string;
  let repository;

  beforeEach(async () => {
    // Get repository
    repository = AppDataSource.getDataSource().getRepository(TokenPriceHistory);

    // Create test data
    tokenAddress = generateRandomEtheriumAddress();
    await Promise.all([
      repository.save({
        token: 'TEST',
        tokenAddress: tokenAddress.toLowerCase(),
        price: 1.5,
        priceUSD: 2.0,
        marketCap: 1000000,
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
      }),
      repository.save({
        token: 'TEST',
        tokenAddress: tokenAddress.toLowerCase(),
        price: 1.6,
        priceUSD: 2.1,
        marketCap: 1100000,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      }),
      repository.save({
        token: 'TEST',
        tokenAddress: tokenAddress.toLowerCase(),
        price: 1.7,
        priceUSD: 2.2,
        marketCap: 1200000,
        timestamp: new Date(), // now
      }),
    ]);
  });

  afterEach(async () => {
    // Clean up test data
    await repository.delete({
      tokenAddress: tokenAddress.toLowerCase(),
    });
  });

  it('should return all price history entries for a token', async () => {
    const result = await axios.post(graphqlUrl, {
      query: getTokenPriceHistoryQuery,
      variables: {
        tokenAddress,
      },
    });

    const entries = result.data.data.getTokenPriceHistory;
    assert.isArray(entries);
    assert.equal(entries.length, 3);
    assert.equal(entries[0].tokenAddress, tokenAddress.toLowerCase());
    assert.equal(entries[0].price, 1.7); // Most recent first
    assert.equal(entries[0].marketCap, 1200000);
  });

  it('should return price history within a time range', async () => {
    const startTime = new Date(Date.now() - 36 * 60 * 60 * 1000); // 36 hours ago
    const endTime = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago

    const result = await axios.post(graphqlUrl, {
      query: getTokenPriceHistoryQuery,
      variables: {
        tokenAddress,
        startTime,
        endTime,
      },
    });

    const entries = result.data.data.getTokenPriceHistory;
    assert.isArray(entries);
    assert.equal(entries.length, 1); // Only the 24-hour old entry should be included
    assert.equal(entries[0].price, 1.6);
    assert.equal(entries[0].marketCap, 1100000);
  });
}

function getTokenMarketCapChanges24hTestCases() {
  let tokenAddress: string;
  let repository;

  beforeEach(async () => {
    // Get repository
    repository = AppDataSource.getDataSource().getRepository(TokenPriceHistory);

    // Create test data
    tokenAddress = generateRandomEtheriumAddress();
    await Promise.all([
      repository.save({
        token: 'TEST',
        tokenAddress: tokenAddress.toLowerCase(),
        price: 1.5,
        priceUSD: 2.0,
        marketCap: 1000000,
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
      }),
      repository.save({
        token: 'TEST',
        tokenAddress: tokenAddress.toLowerCase(),
        price: 1.6,
        priceUSD: 2.1,
        marketCap: 1100000,
        timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23 hours ago
      }),
      repository.save({
        token: 'TEST',
        tokenAddress: tokenAddress.toLowerCase(),
        price: 1.7,
        priceUSD: 2.2,
        marketCap: 1200000,
        timestamp: new Date(), // now
      }),
    ]);
  });

  afterEach(async () => {
    // Clean up test data
    await repository.delete({
      tokenAddress: tokenAddress.toLowerCase(),
    });
  });

  it('should return market cap changes in the last 24 hours', async () => {
    const result = await axios.post(graphqlUrl, {
      query: getTokenMarketCapChanges24hQuery,
      variables: {
        tokenAddress,
      },
    });

    const entries = result.data.data.getTokenMarketCapChanges24h;
    assert.isArray(entries);
    assert.equal(entries.length, 2); // Only entries from last 24 hours
    assert.equal(entries[0].tokenAddress, tokenAddress.toLowerCase());
    assert.equal(entries[0].price, 1.7); // Most recent first
    assert.equal(entries[0].marketCap, 1200000);
    assert.equal(entries[1].price, 1.6);
    assert.equal(entries[1].marketCap, 1100000);
  });

  it('should return empty array for non-existent token', async () => {
    const nonExistentAddress = generateRandomEtheriumAddress();
    const result = await axios.post(graphqlUrl, {
      query: getTokenMarketCapChanges24hQuery,
      variables: {
        tokenAddress: nonExistentAddress,
      },
    });

    const entries = result.data.data.getTokenMarketCapChanges24h;
    assert.isArray(entries);
    assert.equal(entries.length, 0);
  });
}
