import { assert } from 'chai';
import { NETWORK_IDS } from '../../provider';
import { assertThrowsAsync } from '../../../test/testUtils';
import { errorMessages } from '../../utils/errorMessages';
import { closeTo, getTransactionInfoFromNetwork } from './index';

describe('getTransactionDetail test cases', getTransactionDetailTestCases);
describe('closeTo test cases', closeToTestCases);

function getTransactionDetailTestCases() {
  it('should return error when transactionHash is wrong on mainnet', async () => {
    // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da21',
        symbol: 'ETH',
        networkId: NETWORK_IDS.MAIN_NET,
        fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
        toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
        amount: 0.04,
        nonce: 99999999,
        timestamp: 1607360947,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
    );
  });

  it('should return error when sent nonce didnt mine already', async () => {
    const amount = 1760;
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f32',
        symbol: 'DAI',
        networkId: NETWORK_IDS.MAIN_NET,
        fromAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
        toAddress: '0x2Ea846Dc38C6b6451909F1E7ff2bF613a96DC1F3',
        amount,
        nonce: 99999999,
        timestamp: 1624772582,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
    );
  });

  it('should return transaction detail for normal transfer on polygon', async () => {
    // https://polygonscan.com/tx/0x16f122ad45705dfa41bb323c3164b6d840cbb0e9fa8b8e58bd7435370f8bbfc8

    const amount = 30_900;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x16f122ad45705dfa41bb323c3164b6d840cbb0e9fa8b8e58bd7435370f8bbfc8',
      symbol: 'MATIC',
      networkId: NETWORK_IDS.POLYGON,
      fromAddress: '0x9ead03f7136fc6b4bdb0780b00a1c14ae5a8b6d0',
      toAddress: '0x4632e0bcf15db3f4663fea1a6dbf666e563598cd',
      amount,
      timestamp: 1677400082,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'MATIC');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for normal transfer on optimism-sepolia', async () => {
    // https://sepolia-optimism.etherscan.io/tx/0x1b4e9489154a499cd7d0bd7a097e80758e671a32f98559be3b732553afb00809

    const amount = 0.01;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x1b4e9489154a499cd7d0bd7a097e80758e671a32f98559be3b732553afb00809',
      symbol: 'ETH',
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      fromAddress: '0x625bcc1142e97796173104a6e817ee46c593b3c5',
      toAddress: '0x73f9b3f48ebc96ac55cb76c11053b068669a8a67',
      amount,
      timestamp: 1708954960,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
  });

  // it('should return transaction detail for normal transfer on ZKEVM Mainnet', async () => {
  //   // https://zkevm.polygonscan.com/tx/0xeba6b0325a2406fe8223bccc187eb7a34692be3a0c4ef76e940e13342e50a897

  //   const amount = 0.008543881896016492;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0xeba6b0325a2406fe8223bccc187eb7a34692be3a0c4ef76e940e13342e50a897',
  //     symbol: 'ETH',
  //     networkId: NETWORK_IDS.ZKEVM_MAINNET,
  //     fromAddress: '0x948Bd3799aB39A4DDc7bd4fB83717b230f035FBF',
  //     toAddress: '0x0d0794f31c53d4057082889B9bed2D599Eda420d',
  //     amount,
  //     timestamp: 1718267319,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'ETH');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  it('should return transaction detail for normal transfer on ZKEVM Cardano', async () => {
    // https://cardona-zkevm.polygonscan.com/tx/0x5cadef5d2ee803ff78718deb926964c14d83575ccebf477d48b0c3c768a4152a

    const amount = 0.00001;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x5cadef5d2ee803ff78718deb926964c14d83575ccebf477d48b0c3c768a4152a',
      symbol: 'ETH',
      networkId: NETWORK_IDS.ZKEVM_CARDONA,
      fromAddress: '0x9AF3049dD15616Fd627A35563B5282bEA5C32E20',
      toAddress: '0x417a7BA2d8d0060ae6c54fd098590DB854B9C1d5',
      amount,
      timestamp: 1718267581,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for OP token transfer on optimistic', async () => {
    // https://optimistic.etherscan.io/tx/0xf11be189d967831bb8a76656882eeeac944a799bd222acbd556f2156fdc02db4
    const amount = 0.453549908802477308;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0xf11be189d967831bb8a76656882eeeac944a799bd222acbd556f2156fdc02db4',
      symbol: 'OP',
      networkId: NETWORK_IDS.OPTIMISTIC,
      fromAddress: '0xbd928f6016b73066d9ad28351a4708174f18ae99',
      toAddress: '0xa01cf08937103a30e06a5c3b4477f9243a4cbef1',
      amount,
      timestamp: 1679384460,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'OP');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for normal transfer on optimistic', async () => {
    // https://optimistic.etherscan.io/tx/0xc645bd4ebcb1cb249be4b3e4dad46075c973fd30649a39f27f5328ded15074e7
    const amount = 0.001;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0xc645bd4ebcb1cb249be4b3e4dad46075c973fd30649a39f27f5328ded15074e7',
      symbol: 'ETH',
      networkId: NETWORK_IDS.OPTIMISTIC,
      fromAddress: '0xf23ea0b5f14afcbe532a1df273f7b233ebe41c78',
      toAddress: '0xf23ea0b5f14afcbe532a1df273f7b233ebe41c78',
      amount,
      timestamp: 1679484540,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
  });
}

function closeToTestCases() {
  it('should 0.0008436 and 0.0008658 consider as closed amount', function () {
    assert.isTrue(closeTo(0.0008436, 0.0008658));
  });
  it('should 0.0001 and 0.00011 consider as closed amount', function () {
    assert.isTrue(closeTo(0.0001, 0.00011));
  });
  it('should not consider 0.001 and 0.003 consider as closed amount', function () {
    assert.isFalse(closeTo(0.001, 0.003));
  });
}
