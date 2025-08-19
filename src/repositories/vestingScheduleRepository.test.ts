import { assert } from 'chai';
import {
  findAllVestingSchedules,
  findVestingScheduleById,
} from './vestingScheduleRepository';
import { VestingSchedule } from '../entities/vestingSchedule';
import { saveUserDirectlyToDb, SEED_DATA } from '../../test/testUtils';
import { User } from '../entities/user';

describe(
  'VestingSchedule Repository test cases',
  vestingScheduleRepositoryTestCases,
);

function vestingScheduleRepositoryTestCases() {
  let user: User;
  let vestingSchedule1: VestingSchedule;

  beforeEach(async () => {
    // Create test user
    user = await saveUserDirectlyToDb(SEED_DATA.FIRST_USER.email);

    // Create test vesting schedules
    vestingSchedule1 = await VestingSchedule.create({
      name: 'Team Vesting',
      start: new Date('2024-01-01'),
      cliff: new Date('2024-06-01'),
      end: new Date('2025-01-01'),
    }).save();

    await VestingSchedule.create({
      name: 'Advisor Vesting',
      start: new Date('2024-03-01'),
      cliff: new Date('2024-09-01'),
      end: new Date('2025-03-01'),
    }).save();
  });

  afterEach(async () => {
    // Clean up test data
    await VestingSchedule.delete({});
    await User.delete({ id: user.id });
  });

  describe('findAllVestingSchedules', () => {
    it('should return all vesting schedules ordered by start date ASC', async () => {
      const vestingSchedules = await findAllVestingSchedules();

      assert.equal(vestingSchedules.length, 2);
      assert.equal(vestingSchedules[0].name, 'Team Vesting');
      assert.equal(vestingSchedules[1].name, 'Advisor Vesting');

      // Verify ordering by start date
      assert.isTrue(
        vestingSchedules[0].start.getTime() <=
          vestingSchedules[1].start.getTime(),
      );
    });

    it('should return empty array when no vesting schedules exist', async () => {
      await VestingSchedule.delete({});
      const vestingSchedules = await findAllVestingSchedules();

      assert.equal(vestingSchedules.length, 0);
    });
  });

  describe('findVestingScheduleById', () => {
    it('should return vesting schedule by id', async () => {
      const foundVestingSchedule = await findVestingScheduleById(
        vestingSchedule1.id,
      );

      assert.isNotNull(foundVestingSchedule);
      assert.equal(foundVestingSchedule!.id, vestingSchedule1.id);
      assert.equal(foundVestingSchedule!.name, 'Team Vesting');
      assert.deepEqual(foundVestingSchedule!.start, vestingSchedule1.start);
      assert.deepEqual(foundVestingSchedule!.cliff, vestingSchedule1.cliff);
      assert.deepEqual(foundVestingSchedule!.end, vestingSchedule1.end);
    });

    it('should return null when vesting schedule does not exist', async () => {
      const foundVestingSchedule = await findVestingScheduleById(999999);

      assert.isNull(foundVestingSchedule);
    });
  });
}
