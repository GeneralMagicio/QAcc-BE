import { ethers } from 'ethers';
import config from './config';
import { i18n, translationErrorMessagesKeys } from './utils/errorMessages';
import { logger } from './utils/logger';

const INFURA_ID = config.get('INFURA_ID');

export const NETWORK_IDS = {
  MAIN_NET: 1,
  ROPSTEN: 3,
  GOERLI: 5,
  POLYGON: 137,
  OPTIMISTIC: 10,
  OPTIMISM_SEPOLIA: 11155420,

  ZKEVM_MAINNET: 1101,
  ZKEVM_CARDONA: 2442,
};

export const superTokensToToken = {
  ETHx: 'ETH',
  USDCx: 'USDC',
  OPx: 'OP',
};

export const superTokens = [
  {
    underlyingToken: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      id: '0x0000000000000000000000000000000000000000',
    },
    decimals: 18,
    id: '0x0043d7c85c8b96a49a72a92c0b48cdc4720437d7',
    name: 'Super ETH',
    symbol: 'ETHx',
  },
  {
    underlyingToken: {
      decimals: 18,
      id: '0x4200000000000000000000000000000000000042',
      name: 'Optimism',
      symbol: 'OP',
    },
    decimals: 18,
    id: '0x1828bff08bd244f7990eddcd9b19cc654b33cdb4',
    name: 'Super Optimism',
    symbol: 'OPx',
  },
  {
    underlyingToken: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      id: '0x0000000000000000000000000000000000000000',
    },
    decimals: 18,
    id: '0x4ac8bd1bdae47beef2d1c6aa62229509b962aa0d',
    name: 'Super ETH',
    symbol: 'ETHx',
  },
  {
    underlyingToken: {
      decimals: 6,
      id: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
      name: 'USD Coin',
      symbol: 'USDC',
    },
    decimals: 18,
    id: '0x8430f084b939208e2eded1584889c9a66b90562f',
    name: 'Super USD Coin',
    symbol: 'USDCx',
  },
];

export const NETWORKS_IDS_TO_NAME = {
  1: 'MAIN_NET',
  3: 'ROPSTEN',
  5: 'GOERLI',
  137: 'POLYGON',
  10: 'OPTIMISTIC',
  11155420: 'OPTIMISM_SEPOLIA',
  1101: 'ZKEVM_MAINNET',
  2442: 'ZKEVM_CARDONA',
};

const NETWORK_NAMES = {
  MAINNET: 'mainnet',
  ROPSTEN: 'ropsten',
  GOERLI: 'goerli',
  POLYGON: 'polygon-mainnet',
  OPTIMISTIC: 'optimistic-mainnet',
  OPTIMISM_SEPOLIA: 'optimism-sepolia-testnet',
  ZKEVM_CARDONA: 'ZKEVM Cardona',
  ZKEVM_MAINNET: 'ZKEVM Mainnet',
};

const NETWORK_NATIVE_TOKENS = {
  MAINNET: 'ETH',
  ROPSTEN: 'ETH',
  GOERLI: 'ETH',
  POLYGON: 'MATIC',
  OPTIMISTIC: 'ETH',
  OPTIMISM_SEPOLIA: 'ETH',
  ZKEVM_MAINNET: 'ETH',
  ZKEVM_CARDONA: 'ETH',
};

const networkNativeTokensList = [
  {
    networkName: NETWORK_NAMES.MAINNET,
    networkId: NETWORK_IDS.MAIN_NET,
    nativeToken: NETWORK_NATIVE_TOKENS.MAINNET,
  },
  {
    networkName: NETWORK_NAMES.ROPSTEN,
    networkId: NETWORK_IDS.ROPSTEN,
    nativeToken: NETWORK_NATIVE_TOKENS.ROPSTEN,
  },
  {
    networkName: NETWORK_NAMES.GOERLI,
    networkId: NETWORK_IDS.GOERLI,
    nativeToken: NETWORK_NATIVE_TOKENS.GOERLI,
  },
  {
    networkName: NETWORK_NAMES.POLYGON,
    networkId: NETWORK_IDS.POLYGON,
    nativeToken: NETWORK_NATIVE_TOKENS.POLYGON,
  },
  {
    networkName: NETWORK_NAMES.OPTIMISTIC,
    networkId: NETWORK_IDS.OPTIMISTIC,
    nativeToken: NETWORK_NATIVE_TOKENS.OPTIMISTIC,
  },
  {
    networkName: NETWORK_NAMES.OPTIMISM_SEPOLIA,
    networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
    nativeToken: NETWORK_NATIVE_TOKENS.OPTIMISM_SEPOLIA,
  },
  {
    networkName: NETWORK_NAMES.ZKEVM_MAINNET,
    networkId: NETWORK_IDS.ZKEVM_MAINNET,
    nativeToken: NETWORK_NATIVE_TOKENS.ZKEVM_MAINNET,
  },
  {
    networkName: NETWORK_NAMES.ZKEVM_CARDONA,
    networkId: NETWORK_IDS.ZKEVM_CARDONA,
    nativeToken: NETWORK_NATIVE_TOKENS.ZKEVM_CARDONA,
  },
];

export function getNetworkNameById(networkId: number): string {
  const networkInfo = networkNativeTokensList.find(
    item => item.networkId === networkId,
  );
  if (!networkInfo) {
    logger.error(
      'getNetworkNameById() error networkNativeTokensList doesnt have info for networkId',
      networkId,
    );
    throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_NETWORK_ID));
  }
  return networkInfo.networkName;
}

export function getNetworkNativeToken(networkId: number): string {
  const networkInfo = networkNativeTokensList.find(item => {
    return item.networkId === networkId;
  });
  if (!networkInfo) {
    logger.error(
      'getNetworkNativeToken() error networkNativeTokensList doesnt have info for networkId',
      networkId,
    );
    throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_NETWORK_ID));
  }
  return networkInfo.nativeToken;
}

export const getOriginHeader = () => {
  const SERVICE_NAME = process.env.SERVICE_NAME;
  return 'impact-graph-' + SERVICE_NAME || 'unnamed';
};

export function getProvider(networkId: number) {
  let url;
  let options;
  switch (networkId) {
    case NETWORK_IDS.OPTIMISM_SEPOLIA:
      url = `https://optimism-sepolia.infura.io/v3/${INFURA_ID}`;
      break;
    // Infura doesn support Polygon ZKEVM
    case NETWORK_IDS.ZKEVM_MAINNET:
      url = process.env.ZKEVM_MAINNET_NODE_HTTP_URL as string;
      break;

    case NETWORK_IDS.ZKEVM_CARDONA:
      url = process.env.ZKEVM_CARDONA_NODE_HTTP_URL as string;
      break;

    default: {
      // Use infura
      const connectionInfo = ethers.providers.InfuraProvider.getUrl(
        ethers.providers.getNetwork(networkId),
        { projectId: INFURA_ID },
      );
      connectionInfo.headers = {
        ...connectionInfo.headers,
        Origin: getOriginHeader(),
      };
      return new ethers.providers.JsonRpcProvider(connectionInfo);
    }
  }

  return new ethers.providers.JsonRpcProvider(
    {
      url,
      headers: {
        Origin: getOriginHeader(),
      },
    },
    options,
  );
}

export function getBlockExplorerApiUrl(networkId: number): string {
  let apiUrl;
  let apiKey;
  switch (networkId) {
    case NETWORK_IDS.MAIN_NET:
      apiUrl = config.get('ETHERSCAN_MAINNET_API_URL');
      apiKey = config.get('ETHERSCAN_API_KEY');
      break;
    case NETWORK_IDS.ROPSTEN:
      apiUrl = config.get('ETHERSCAN_ROPSTEN_API_URL');
      apiKey = config.get('ETHERSCAN_API_KEY');
      break;
    case NETWORK_IDS.GOERLI:
      apiUrl = config.get('ETHERSCAN_GOERLI_API_URL');
      apiKey = config.get('ETHERSCAN_API_KEY');
      break;
    case NETWORK_IDS.POLYGON:
      apiUrl = config.get('POLYGON_SCAN_API_URL');
      apiKey = config.get('POLYGON_SCAN_API_KEY');
      break;
    case NETWORK_IDS.OPTIMISTIC:
      apiUrl = config.get('OPTIMISTIC_SCAN_API_URL');
      apiKey = config.get('OPTIMISTIC_SCAN_API_KEY');
      break;
    case NETWORK_IDS.OPTIMISM_SEPOLIA:
      apiUrl = config.get('OPTIMISTIC_SEPOLIA_SCAN_API_URL');
      apiKey = config.get('OPTIMISTIC_SEPOLIA_SCAN_API_KEY');
      break;
    case NETWORK_IDS.ZKEVM_MAINNET:
      apiUrl = config.get('ZKEVM_MAINNET_SCAN_API_URL');
      apiKey = config.get('ZKEVM_MAINET_SCAN_API_KEY');
      break;
    case NETWORK_IDS.ZKEVM_CARDONA:
      apiUrl = config.get('ZKEVM_CARDONA_SCAN_API_URL');
      apiKey = config.get('ZKEVM_CARDONA_SCAN_API_KEY');
      break;
    default:
      logger.error(
        'getBlockExplorerApiUrl() no url found for networkId',
        networkId,
      );
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_NETWORK_ID));
  }

  return `${apiUrl}?apikey=${apiKey}`;
}
