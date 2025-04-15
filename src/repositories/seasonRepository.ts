import { LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Season } from '../entities/season';

export const findSeasonById = async (id: number): Promise<Season | null> => {
  return Season.findOne({
    where: { id },
  });
};

export const findSeasonByNumber = async (
  seasonNumber: number,
): Promise<Season | null> => {
  return Season.findOne({
    where: { seasonNumber },
  });
};

export const findActiveSeasonByDate = async (
  date: Date = new Date(),
): Promise<Season | null> => {
  return Season.findOne({
    where: {
      startDate: LessThanOrEqual(date),
      endDate: MoreThanOrEqual(date),
    },
  });
};

export const findAllSeasons = async (): Promise<Season[]> => {
  return Season.find({
    order: {
      seasonNumber: 'DESC',
    },
  });
};

export const createSeason = async (params: {
  seasonNumber: number;
  startDate: Date;
  endDate: Date;
}): Promise<Season> => {
  const { seasonNumber, startDate, endDate } = params;
  const season = Season.create({
    seasonNumber,
    startDate,
    endDate,
  });
  return season.save();
};
