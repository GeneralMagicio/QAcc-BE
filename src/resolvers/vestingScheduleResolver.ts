import { Arg, Int, Query, Resolver } from 'type-graphql';
import { VestingSchedule } from '../entities/vestingSchedule';
import {
  findAllVestingSchedules,
  findVestingScheduleById,
} from '../repositories/vestingScheduleRepository';

@Resolver(_of => VestingSchedule)
export class VestingScheduleResolver {
  @Query(_returns => [VestingSchedule])
  async vestingSchedules(): Promise<VestingSchedule[]> {
    return findAllVestingSchedules();
  }

  @Query(_returns => VestingSchedule, { nullable: true })
  async vestingSchedule(
    @Arg('id', _type => Int) id: number,
  ): Promise<VestingSchedule | null> {
    return findVestingScheduleById(id);
  }
}
