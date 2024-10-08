export interface FlowUpdatedEvent {
  id: string;
  flowOperator: string;
  flowRate: string;
  transactionHash: string;
  receiver: string;
  sender: string;
  token: string;
  timestamp: string;
}

export interface SuperFluidAdapterInterface {
  accountBalance(accountId: string): Promise<any>;
  getFlowByTxHash(params: {
    receiver: string;
    sender: string;
    flowRate: string;
    transactionHash: string;
  }): Promise<FlowUpdatedEvent | undefined>;
  getFlowByReceiverSenderFlowRate(params: {
    receiver: string;
    sender: string;
    flowRate: string;
    timestamp_gt: number;
  }): Promise<FlowUpdatedEvent | undefined>;
}
