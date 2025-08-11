import { MigrationInterface, QueryRunner } from 'typeorm';

export class PopulateTokenHolders1746613421855 implements MigrationInterface {
  name = 'PopulateTokenHolders1746613421855';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Define the token holder data
    const tokenHolders = [
      // PACK
      {
        projectName: 'PACK',
        tag: 'Vesting Contract',
        address: '0xD1959e8a3D0C2cB2768543feD5bdD27D19b6c73e',
      },
      {
        projectName: 'PACK',
        tag: 'Liquidity Bot',
        address: '0xe2D718Cd6B9b3e65ad4DCe6903EC5e37FEd0297b',
      },
      {
        projectName: 'PACK',
        tag: 'DEX LP',
        address: '0x8a8C62E6B1C8EE5b104B7C7401D0b4cDfa4CeCBf',
      },
      // TDM
      {
        projectName: 'TDM',
        tag: 'Vesting Contract',
        address: '0xAbeFd091Abfb87528151e48973829c407FFA1333',
      },
      {
        projectName: 'TDM',
        tag: 'Liquidity Bot',
        address: '0xa44A5E67236CC2674e24294C1AB2f13b162338d8',
      },
      {
        projectName: 'TDM',
        tag: 'DEX LP',
        address: '0x3c2A6424f245136a15eAc951FA27D33B8357b362',
      },
      // LOCK
      {
        projectName: 'LOCK',
        tag: 'Vesting Contract',
        address: '0x9E17eFea75A3a33fB235B079D82c83458C14369C',
      },
      {
        projectName: 'LOCK',
        tag: 'Liquidity Bot',
        address: '0x7003c15252eC37DcC7f1134CFD9AD3d6d0449bB5',
      },
      {
        projectName: 'LOCK',
        tag: 'DEX LP',
        address: '0xfB7771110Fa0b9d2F3c921Ace03991701b8623aF',
      },
      // H2DAO
      {
        projectName: 'H2DAO',
        tag: 'Vesting Contract',
        address: '0x79c744e6db81dd83E83271cDB53578318F6c1D65',
      },
      {
        projectName: 'H2DAO',
        tag: 'Liquidity Bot',
        address: '0x27F32d16C1C8Ce8C36099A444B2A812C14a287FB',
      },
      {
        projectName: 'H2DAO',
        tag: 'DEX LP',
        address: '0x5F6520d0a751Aaf8353874583A152e49a0828eE5',
      },
      // X23
      {
        projectName: 'X23',
        tag: 'Vesting Contract',
        address: '0x6B5d37c206D56B16F44b0C1b89002fd9B138e9Be',
      },
      {
        projectName: 'X23',
        tag: 'Liquidity Bot',
        address: '0xd189BcEA30511d4E229BC2d901120f2881b9D0e2',
      },
      {
        projectName: 'X23',
        tag: 'DEX LP',
        address: '0x0De6dA16D5181a9Fe2543cE1eeb4bFD268D68838',
      },
      // CTZN
      {
        projectName: 'CTZN',
        tag: 'Vesting Contract',
        address: '0x0DDd250bfb440e6deF3157eE29747e8ac29153aD',
      },
      {
        projectName: 'CTZN',
        tag: 'Liquidity Bot',
        address: '0x28e7772b474C3f7147Ca2aD4F7C9Bd6a23c72E36',
      },
      {
        projectName: 'CTZN',
        tag: 'DEX LP',
        address: '0x746CF1bAaa81E6f2dEe39Bd4E3cB5E9f0Edf98a8',
      },
      // PRSM
      {
        projectName: 'PRSM',
        tag: 'Vesting Contract',
        address: '0x96b6aA42777D0fDDE8F8e45f35129D1D11CdA981',
      },
      {
        projectName: 'PRSM',
        tag: 'Liquidity Bot',
        address: '0x84028C23F5f8051598b20696C8240c012C994Ba1',
      },
      {
        projectName: 'PRSM',
        tag: 'DEX LP',
        address: '0x4DC15eDc968EceAec3A5e0F12d0aCECACee05e25',
      },
      // GRNDT
      {
        projectName: 'GRNDT',
        tag: 'Vesting Contract',
        address: '0x480f463b0831990b1929fB401f21E55B21E985cD',
      },
      {
        projectName: 'GRNDT',
        tag: 'Liquidity Bot',
        address: '0xA864e45F7799ba239580186E94b9390A6f568ade',
      },
      {
        projectName: 'GRNDT',
        tag: 'DEX LP',
        address: '0x460A8186AA4574C18709d1eFF118EfDAa5235C19',
      },
      // ACHAD
      {
        projectName: 'ACHAD',
        tag: 'Vesting Contract',
        address: '0xC7374519fc9DfcDaCD3bd1f337AC98dD3dB09dE9',
      },
      {
        projectName: 'ACHAD',
        tag: 'Liquidity Bot',
        address: '0x7ca5d9e997A9310b180fd394cF80183Eb5aaDF66',
      },
      {
        projectName: 'ACHAD',
        tag: 'DEX LP',
        address: '0x7F4818ae354C30d79b1E0C1838382D64b93366Aa',
      },
      // MELS
      {
        projectName: 'MELS',
        tag: 'Vesting Contract',
        address: '0xABfaeb84364c419b19A9241434a997c88731C6fa',
      },
      {
        projectName: 'MELS',
        tag: 'Liquidity Bot',
        address: '0xdB99BeF6D8Bb9703c9B2F110aE8C30580830b92D',
      },
      {
        projectName: 'MELS',
        tag: 'DEX LP',
        address: '0x6E9869FeA80D791e58AfA60d3Dd2e14B16Ef064a',
      },
      // BEAST
      {
        projectName: 'BEAST',
        tag: 'Vesting Contract',
        address: '0x1e4350605E143E58F0C786A76FA8f70257B3D20e',
      },
      {
        projectName: 'BEAST',
        tag: 'Liquidity Bot',
        address: '0xadfC4Bc382F4ECe69a19b3Eecad5Dd62d9e919ae',
      },
      {
        projectName: 'BEAST',
        tag: 'DEX LP',
        address: '0xb7a6F7e6Efa1024c44028bc1AB4E08F0F377567e',
      },
      // AKA
      {
        projectName: 'AKA',
        tag: 'Vesting Contract',
        address: '0x9858b8FeE34F27959e3CDFAf022a5D0844eaeA65',
      },
      {
        projectName: 'AKA',
        tag: 'Liquidity Bot',
        address: '0x6925B3c6ad873e1F84b65c37B4562F03D1D15687',
      },
      {
        projectName: 'AKA',
        tag: 'DEX LP',
        address: '0xd404B5ec643A129e2853D78Ba98368cee097ae92',
      },
    ];

    // Insert each token holder
    for (const tokenHolder of tokenHolders) {
      await queryRunner.query(
        `INSERT INTO "token_holder" ("projectName", "tag", "address")
         VALUES ($1, $2, $3)`,
        [tokenHolder.projectName, tokenHolder.tag, tokenHolder.address],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Define the project names that were inserted
    const projectNames = [
      'PACK',
      'TDM',
      'LOCK',
      'H2DAO',
      'X23',
      'CTZN',
      'PRSM',
      'GRNDT',
      'ACHAD',
      'MELS',
      'BEAST',
      'AKA',
    ];

    // Remove the inserted token holders
    for (const projectName of projectNames) {
      await queryRunner.query(
        `DELETE FROM "token_holder" WHERE "projectName" = $1`,
        [projectName],
      );
    }
  }
}
