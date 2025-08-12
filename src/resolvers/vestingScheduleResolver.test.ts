import { assert } from 'chai';
import { VestingScheduleResolver } from './vestingScheduleResolver';
import { VestingSchedule } from '../entities/vestingSchedule';
import { saveUserDirectlyToDb, SEED_DATA } from '../../test/testUtils';
import { User } from '../entities/user';

describe(
  'VestingSchedule Resolver test cases',
  vestingScheduleResolverTestCases,
);

function vestingScheduleResolverTestCases() {
  let user: User;
  let vestingScheduleResolver: VestingScheduleResolver;
  let vestingSchedule1: VestingSchedule;

  beforeEach(async () => {
    vestingScheduleResolver = new VestingScheduleResolver();

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

  describe('vestingSchedules query', () => {
    it('should return all vesting schedules', async () => {
      const result = await vestingScheduleResolver.vestingSchedules();

      assert.equal(result.length, 2);
      assert.equal(result[0].name, 'Team Vesting');
      assert.equal(result[1].name, 'Advisor Vesting');
    });

    it('should return empty array when no vesting schedules exist', async () => {
      await VestingSchedule.delete({});
      const result = await vestingScheduleResolver.vestingSchedules();

      assert.equal(result.length, 0);
    });

    it('should return vesting schedules ordered by start date', async () => {
      const result = await vestingScheduleResolver.vestingSchedules();

      // Should be ordered by start date ASC
      assert.isTrue(result[0].start.getTime() <= result[1].start.getTime());
    });
  });

  describe('vestingSchedule query', () => {
    it('should return vesting schedule by id', async () => {
      const result = await vestingScheduleResolver.vestingSchedule(
        vestingSchedule1.id,
      );

      assert.isNotNull(result);
      assert.equal(result!.id, vestingSchedule1.id);
      assert.equal(result!.name, 'Team Vesting');
      assert.deepEqual(result!.start, vestingSchedule1.start);
      assert.deepEqual(result!.cliff, vestingSchedule1.cliff);
      assert.deepEqual(result!.end, vestingSchedule1.end);
    });

    it('should return null when vesting schedule does not exist', async () => {
      const result = await vestingScheduleResolver.vestingSchedule(999999);

      assert.isNull(result);
    });
  });

  describe('Vesting schedule field validation', () => {
    it('should have all required fields populated', async () => {
      const result = await vestingScheduleResolver.vestingSchedule(
        vestingSchedule1.id,
      );

      assert.isNotNull(result);
      assert.isNumber(result!.id);
      assert.isString(result!.name);
      assert.instanceOf(result!.start, Date);
      assert.instanceOf(result!.cliff, Date);
      assert.instanceOf(result!.end, Date);
      assert.instanceOf(result!.createdAt, Date);
      assert.instanceOf(result!.updatedAt, Date);
    });

    it('should validate date chronology (start <= cliff <= end)', async () => {
      const result = await vestingScheduleResolver.vestingSchedule(
        vestingSchedule1.id,
      );

      assert.isNotNull(result);
      assert.isTrue(result!.start.getTime() <= result!.cliff.getTime());
      assert.isTrue(result!.cliff.getTime() <= result!.end.getTime());
    });
  });

  describe('Data integrity', () => {
    it('should maintain data consistency across queries', async () => {
      const singleResult = await vestingScheduleResolver.vestingSchedule(
        vestingSchedule1.id,
      );
      const allResults = await vestingScheduleResolver.vestingSchedules();
      const foundInAll = allResults.find(vs => vs.id === vestingSchedule1.id);

      assert.isNotNull(singleResult);
      assert.isNotNull(foundInAll);
      assert.equal(singleResult!.name, foundInAll!.name);
      assert.deepEqual(singleResult!.start, foundInAll!.start);
      assert.deepEqual(singleResult!.cliff, foundInAll!.cliff);
      assert.deepEqual(singleResult!.end, foundInAll!.end);
    });
  });
}
