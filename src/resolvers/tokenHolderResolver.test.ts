import { assert } from 'chai';
import { TokenHolderResolver } from './tokenHolderResolver';
import { TokenHolder } from '../entities/tokenHolder';
import { saveUserDirectlyToDb, SEED_DATA } from '../../test/testUtils';
import { User } from '../entities/user';

describe('TokenHolder Resolver test cases', tokenHolderResolverTestCases);

function tokenHolderResolverTestCases() {
  let user: User;
  let tokenHolderResolver: TokenHolderResolver;
  let tokenHolder1: TokenHolder;

  beforeEach(async () => {
    tokenHolderResolver = new TokenHolderResolver();

    // Create test user
    user = await saveUserDirectlyToDb(SEED_DATA.FIRST_USER.email);

    // Create test token holders
    tokenHolder1 = await TokenHolder.create({
      projectName: 'PACK',
      address: '0x1234567890123456789012345678901234567890',
      tag: 'Team',
    }).save();

    await TokenHolder.create({
      projectName: 'PACK',
      address: '0x2345678901234567890123456789012345678901',
      tag: 'Advisor',
    }).save();

    await TokenHolder.create({
      projectName: 'X23',
      address: '0x1234567890123456789012345678901234567890',
      tag: 'Investor',
    }).save();
  });

  afterEach(async () => {
    // Clean up test data
    await TokenHolder.delete({});
    await User.delete({ id: user.id });
  });

  describe('tokenHolders query', () => {
    it('should return all token holders', async () => {
      const result = await tokenHolderResolver.tokenHolders();

      assert.equal(result.length, 3);
      assert.isTrue(result.some(holder => holder.projectName === 'PACK'));
      assert.isTrue(result.some(holder => holder.projectName === 'X23'));
    });

    it('should return empty array when no token holders exist', async () => {
      await TokenHolder.delete({});
      const result = await tokenHolderResolver.tokenHolders();

      assert.equal(result.length, 0);
    });

    it('should return token holders ordered by project name and tag', async () => {
      const result = await tokenHolderResolver.tokenHolders();

      // Should be ordered by projectName ASC, tag ASC
      assert.equal(result[0].projectName, 'PACK');
      assert.equal(result[0].tag, 'Advisor');
      assert.equal(result[1].projectName, 'PACK');
      assert.equal(result[1].tag, 'Team');
      assert.equal(result[2].projectName, 'X23');
      assert.equal(result[2].tag, 'Investor');
    });
  });

  describe('tokenHolder query', () => {
    it('should return token holder by id', async () => {
      const result = await tokenHolderResolver.tokenHolder(tokenHolder1.id);

      assert.isNotNull(result);
      assert.equal(result!.id, tokenHolder1.id);
      assert.equal(result!.projectName, 'PACK');
      assert.equal(
        result!.address,
        '0x1234567890123456789012345678901234567890',
      );
      assert.equal(result!.tag, 'Team');
    });

    it('should return null when token holder does not exist', async () => {
      const result = await tokenHolderResolver.tokenHolder(999999);

      assert.isNull(result);
    });
  });

  describe('tokenHoldersByProject query', () => {
    it('should return token holders for specific project', async () => {
      const result = await tokenHolderResolver.tokenHoldersByProject('PACK');

      assert.equal(result.length, 2);
      assert.isTrue(result.every(holder => holder.projectName === 'PACK'));

      // Should be ordered by tag
      assert.equal(result[0].tag, 'Advisor');
      assert.equal(result[1].tag, 'Team');
    });

    it('should return empty array when no token holders exist for project', async () => {
      const result =
        await tokenHolderResolver.tokenHoldersByProject('NONEXISTENT');

      assert.equal(result.length, 0);
    });
  });

  describe('tokenHoldersByAddress query', () => {
    it('should return token holders for specific address', async () => {
      const result = await tokenHolderResolver.tokenHoldersByAddress(
        '0x1234567890123456789012345678901234567890',
      );

      assert.equal(result.length, 2);
      assert.isTrue(
        result.every(
          holder =>
            holder.address === '0x1234567890123456789012345678901234567890',
        ),
      );

      // Should be ordered by project name
      assert.equal(result[0].projectName, 'PACK');
      assert.equal(result[1].projectName, 'X23');
    });

    it('should return empty array when no token holders exist for address', async () => {
      const result =
        await tokenHolderResolver.tokenHoldersByAddress('0xnonexistent');

      assert.equal(result.length, 0);
    });
  });

  describe('Token holder field validation', () => {
    it('should have all required fields populated', async () => {
      const result = await tokenHolderResolver.tokenHolder(tokenHolder1.id);

      assert.isNotNull(result);
      assert.isNumber(result!.id);
      assert.isString(result!.projectName);
      assert.isString(result!.address);
      assert.isString(result!.tag);
      assert.instanceOf(result!.createdAt, Date);
      assert.instanceOf(result!.updatedAt, Date);
    });

    it('should handle null tag gracefully', async () => {
      const tokenHolderWithoutTag = await TokenHolder.create({
        projectName: 'TEST',
        address: '0x9999999999999999999999999999999999999999',
        tag: undefined,
      }).save();

      const result = await tokenHolderResolver.tokenHolder(
        tokenHolderWithoutTag.id,
      );

      assert.isNotNull(result);
      assert.equal(result!.projectName, 'TEST');
      assert.equal(
        result!.address,
        '0x9999999999999999999999999999999999999999',
      );
      assert.isNull(result!.tag);
    });
  });

  describe('Data integrity', () => {
    it('should maintain data consistency across queries', async () => {
      const singleResult = await tokenHolderResolver.tokenHolder(
        tokenHolder1.id,
      );
      const allResults = await tokenHolderResolver.tokenHolders();
      const foundInAll = allResults.find(th => th.id === tokenHolder1.id);

      assert.isNotNull(singleResult);
      assert.isNotNull(foundInAll);
      assert.equal(singleResult!.projectName, foundInAll!.projectName);
      assert.equal(singleResult!.address, foundInAll!.address);
      assert.equal(singleResult!.tag, foundInAll!.tag);
    });

    it('should filter correctly by project name', async () => {
      const projectResults =
        await tokenHolderResolver.tokenHoldersByProject('PACK');
      const allResults = await tokenHolderResolver.tokenHolders();
      const packHoldersFromAll = allResults.filter(
        th => th.projectName === 'PACK',
      );

      assert.equal(projectResults.length, packHoldersFromAll.length);
      assert.deepEqual(
        projectResults.map(th => th.id).sort(),
        packHoldersFromAll.map(th => th.id).sort(),
      );
    });
  });
}
