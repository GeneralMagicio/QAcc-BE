import { assert } from 'chai';
import {
  findAllTokenHolders,
  findTokenHolderById,
  findTokenHoldersByProjectName,
  findTokenHoldersByAddress,
} from './tokenHolderRepository';
import { TokenHolder } from '../entities/tokenHolder';
import { saveUserDirectlyToDb, SEED_DATA } from '../../test/testUtils';
import { User } from '../entities/user';

describe('TokenHolder Repository test cases', tokenHolderRepositoryTestCases);

function tokenHolderRepositoryTestCases() {
  let user: User;
  let tokenHolder1: TokenHolder;

  beforeEach(async () => {
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

  describe('findAllTokenHolders', () => {
    it('should return all token holders ordered by project name and tag', async () => {
      const tokenHolders = await findAllTokenHolders();

      assert.equal(tokenHolders.length, 3);

      // Verify ordering by projectName ASC, tag ASC
      assert.equal(tokenHolders[0].projectName, 'PACK');
      assert.equal(tokenHolders[0].tag, 'Advisor');
      assert.equal(tokenHolders[1].projectName, 'PACK');
      assert.equal(tokenHolders[1].tag, 'Team');
      assert.equal(tokenHolders[2].projectName, 'X23');
      assert.equal(tokenHolders[2].tag, 'Investor');
    });

    it('should return empty array when no token holders exist', async () => {
      await TokenHolder.delete({});
      const tokenHolders = await findAllTokenHolders();

      assert.equal(tokenHolders.length, 0);
    });
  });

  describe('findTokenHolderById', () => {
    it('should return token holder by id', async () => {
      const foundTokenHolder = await findTokenHolderById(tokenHolder1.id);

      assert.isNotNull(foundTokenHolder);
      assert.equal(foundTokenHolder!.id, tokenHolder1.id);
      assert.equal(foundTokenHolder!.projectName, 'PACK');
      assert.equal(
        foundTokenHolder!.address,
        '0x1234567890123456789012345678901234567890',
      );
      assert.equal(foundTokenHolder!.tag, 'Team');
    });

    it('should return null when token holder does not exist', async () => {
      const foundTokenHolder = await findTokenHolderById(999999);

      assert.isNull(foundTokenHolder);
    });
  });

  describe('findTokenHoldersByProjectName', () => {
    it('should return token holders for specific project ordered by tag', async () => {
      const packHolders = await findTokenHoldersByProjectName('PACK');

      assert.equal(packHolders.length, 2);
      assert.equal(packHolders[0].tag, 'Advisor');
      assert.equal(packHolders[1].tag, 'Team');
      assert.isTrue(packHolders.every(holder => holder.projectName === 'PACK'));
    });

    it('should return empty array when no token holders exist for project', async () => {
      const holders = await findTokenHoldersByProjectName('NONEXISTENT');

      assert.equal(holders.length, 0);
    });
  });

  describe('findTokenHoldersByAddress', () => {
    it('should return token holders for specific address ordered by project name', async () => {
      const addressHolders = await findTokenHoldersByAddress(
        '0x1234567890123456789012345678901234567890',
      );

      assert.equal(addressHolders.length, 2);
      assert.equal(addressHolders[0].projectName, 'PACK');
      assert.equal(addressHolders[1].projectName, 'X23');
      assert.isTrue(
        addressHolders.every(
          holder =>
            holder.address === '0x1234567890123456789012345678901234567890',
        ),
      );
    });

    it('should return empty array when no token holders exist for address', async () => {
      const holders = await findTokenHoldersByAddress('0xnonexistent');

      assert.equal(holders.length, 0);
    });
  });
}
