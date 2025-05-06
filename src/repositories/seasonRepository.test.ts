import { assert } from 'chai';
import moment from 'moment';
import { Season } from '../entities/season';
import {
  findActiveSeasonByDate,
  findAllSeasons,
  findSeasonById,
  findSeasonByNumber,
  createSeason,
} from './seasonRepository';

describe('Season Repository Test Cases', () => {
  beforeEach(async () => {
    // Clean up data before each test case
    await Season.delete({});
  });

  afterEach(async () => {
    // Clean up data after each test case
    await Season.delete({});
  });

  it('should create a new season', async () => {
    const seasonData = {
      seasonNumber: 1,
      startDate: moment().startOf('year').toDate(),
      endDate: moment().endOf('year').toDate(),
    };

    const season = await createSeason(seasonData);

    assert.isNotNull(season);
    assert.equal(season.seasonNumber, seasonData.seasonNumber);
    assert.equal(
      season.startDate.toISOString(),
      seasonData.startDate.toISOString(),
    );
    assert.equal(
      season.endDate.toISOString(),
      seasonData.endDate.toISOString(),
    );
  });

  it('should find a season by ID', async () => {
    const season = await createSeason({
      seasonNumber: 1,
      startDate: moment().startOf('year').toDate(),
      endDate: moment().endOf('year').toDate(),
    });

    const foundSeason = await findSeasonById(season.id);

    assert.isNotNull(foundSeason);
    assert.equal(foundSeason?.id, season.id);
    assert.equal(foundSeason?.seasonNumber, season.seasonNumber);
  });

  it('should find a season by number', async () => {
    const season = await createSeason({
      seasonNumber: 1,
      startDate: moment().startOf('year').toDate(),
      endDate: moment().endOf('year').toDate(),
    });

    const foundSeason = await findSeasonByNumber(season.seasonNumber);

    assert.isNotNull(foundSeason);
    assert.equal(foundSeason?.id, season.id);
    assert.equal(foundSeason?.seasonNumber, season.seasonNumber);
  });

  it('should find the active season by date', async () => {
    // Create a past season
    await createSeason({
      seasonNumber: 1,
      startDate: moment().subtract(2, 'years').startOf('year').toDate(),
      endDate: moment().subtract(2, 'years').endOf('year').toDate(),
    });

    // Create an active season
    const activeSeason = await createSeason({
      seasonNumber: 2,
      startDate: moment().subtract(1, 'month').toDate(),
      endDate: moment().add(1, 'month').toDate(),
    });

    // Create a future season
    await createSeason({
      seasonNumber: 3,
      startDate: moment().add(1, 'year').startOf('year').toDate(),
      endDate: moment().add(1, 'year').endOf('year').toDate(),
    });

    const foundActiveSeason = await findActiveSeasonByDate();

    assert.isNotNull(foundActiveSeason);
    assert.equal(foundActiveSeason?.id, activeSeason.id);
    assert.equal(foundActiveSeason?.seasonNumber, activeSeason.seasonNumber);
  });

  it('should find all seasons ordered by season number descending', async () => {
    // Create multiple seasons
    const season1 = await createSeason({
      seasonNumber: 1,
      startDate: moment().subtract(1, 'year').startOf('year').toDate(),
      endDate: moment().subtract(1, 'year').endOf('year').toDate(),
    });

    const season2 = await createSeason({
      seasonNumber: 2,
      startDate: moment().startOf('year').toDate(),
      endDate: moment().endOf('year').toDate(),
    });

    const season3 = await createSeason({
      seasonNumber: 3,
      startDate: moment().add(1, 'year').startOf('year').toDate(),
      endDate: moment().add(1, 'year').endOf('year').toDate(),
    });

    const seasons = await findAllSeasons();

    assert.equal(seasons.length, 3);
    assert.equal(seasons[0].id, season3.id); // Most recent first
    assert.equal(seasons[1].id, season2.id);
    assert.equal(seasons[2].id, season1.id);
  });

  it('should return null when no active season is found', async () => {
    // Create only past and future seasons
    await createSeason({
      seasonNumber: 1,
      startDate: moment().subtract(2, 'years').toDate(),
      endDate: moment().subtract(1, 'year').toDate(),
    });

    await createSeason({
      seasonNumber: 2,
      startDate: moment().add(1, 'year').toDate(),
      endDate: moment().add(2, 'years').toDate(),
    });

    const activeSeason = await findActiveSeasonByDate();

    assert.isNull(activeSeason);
  });
});
