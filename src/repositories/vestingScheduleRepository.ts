import { VestingSchedule } from '../entities/vestingSchedule';

export const findAllVestingSchedules = async (): Promise<VestingSchedule[]> => {
  return VestingSchedule.find({
    order: {
      start: 'ASC',
    },
  });
};

export const findVestingScheduleById = async (
  id: number,
): Promise<VestingSchedule | null> => {
  return VestingSchedule.findOne({
    where: { id },
  });
};
