import {
  GetBalanceOfAddressesInputParams,
  GetBalanceOfAddressesResponse,
  GetBalanceOfAnAddressesResponse,
  GetBalancesUpdatedAfterASpecificDateInputParams,
  GetBalancesUpdatedAfterASpecificDateResponse,
  GetLatestBalanceOfAnAddressInputParams,
  GetLeastIndexedBlockTimeStampInputParams,
  GivPowerBalanceAggregatorInterface,
} from './givPowerBalanceAggregatorInterface';

export class GivPowerBalanceAggregatorMock
  implements GivPowerBalanceAggregatorInterface
{
  async getAddressesBalance(
    params: GetBalanceOfAddressesInputParams,
  ): Promise<GetBalanceOfAddressesResponse> {
    return params.addresses.map(address => {
      return {
        address,
        balance: 13, // Just an example balance
        updatedAt: new Date('2023-08-10T16:18:02.655Z'),
        networks: [100],
      };
    });
  }

  async getLatestBalanceSingle(
    params: GetLatestBalanceOfAnAddressInputParams,
  ): Promise<GetBalanceOfAnAddressesResponse> {
    // Mocked data
    return {
      address: params.address,
      balance: 200, // Just another example balance
      updatedAt: new Date('2023-08-10T16:18:02.655Z'),
      networks: params.network ? [Number(params.network)] : [100],
    };
  }

  async getBalancesUpdatedAfterDate(
    params: GetBalancesUpdatedAfterASpecificDateInputParams,
  ): Promise<GetBalancesUpdatedAfterASpecificDateResponse> {
    // Mocked data
    return [
      {
        address: '0x1234567890123456789012345678901234567890',
        balance: 300,
        updatedAt: new Date('2023-08-10T16:18:02.655Z'),
        networks: [100],
      },
    ];
  }

  async getLeastIndexedBlockTimeStamp(
    params: GetLeastIndexedBlockTimeStampInputParams,
  ): Promise<number> {
    // Mocked data
    return 1691739112;
  }
}
