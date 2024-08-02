export * from './base.result';

import { SuccessfulTransactionReceiptResponse } from 'starknet';
import ticketAbi from '../abi/ticket.json';
import lotteryAbi from '../abi/lottery645.json';
import accountAbi from '../abi/account.json';
import starkFlipAbi from '../abi/starkflip.json';
import erc20Abi from '../abi/erc20.json';
import src5Abi from '../abi/src5.json';

export enum EventTopic {
  TICKET_CREATED = '0x2013b4817f658d5d62bc494cf84c1dfa1150756dcf9783d0fc31d8133795c6d',
  LOTTERY_STARTED = '0x1b009627a191bdefc95afc44ac77f4d4f9d6a4209e8b4461dfbe11530bb1222',
  DRAWN_NUMBERS = '0x1d9ef9b22b4d2736713032ee746f4f355e05f1b2258bbcfb4489de3f14c67b',
  WITHDRAW_WINNING = '',
  CREATE_GAME = '0x3db312ff232622e76f693259435f65b88e47d04f859eb8bd53ae0d7ba34e3c6',
  SETTLE_GAME = '0x1c1c556a8deff5f5dcc895ef79f280abfa7ad67dfa4fb89a05bda4a1ce4974b',
}

export enum StarkFlipEnum {
  CONTRACT_ADDRESS = '0x7cfe1d0b0c7be88f60d23b311c8322114a1de14ae7a35ce879d980cbbea8a6c',
  POOL_ID = '0x79c3900810d92685684c9a761f3af3f7a84457d7130c4d1c7fff12245d3e329',
}

export type LotteryOnchainDetail = {
  id: number;
  minimumPrice: number;
  state: number;
  startTime: number;
  drawTime: number;
  drawnNumbers: bigint[];
  amountOfTickets: number;
  totalValue: number;
  jackpot: number;
  jackpotWinners: number;
};

export type TicketOnchainDetail = {
  ticketId: number;
  lotteryAddress: string;
  lotteryId: number;
  pickedNumbers: number[];
  payOut: number;
  user: string;
  sameCombinationCounter: number;
};

export enum EventType {
  StartNewLottery = 'StartNewLottery',
  DrawnNumbers = 'DrawnNumbers',
  WithdrawWinning = 'WithdrawWinning',
  TicketCreated = 'TicketCreated',
  CreateGame = 'CreateGame',
  SettleGame = 'SettleGame',
}
export type LogsReturnValues = SuccessfulTransactionReceiptResponse & {
  returnValues: any;
  eventType: EventType;
};

export const ABIS = {
  SRC5ABI: src5Abi,
  ERC20ABI: erc20Abi,
  TicketABI: ticketAbi,
  LotteryABI: lotteryAbi,
  AccountABI: accountAbi,
  StarkFlipAbi: starkFlipAbi,
};
