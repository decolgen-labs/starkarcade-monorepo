import { BigNumberish, Contract, Provider, num } from 'starknet';
import { ABIS } from './types';
import { formattedContractAddress } from '@app/shared/utils';

export type CreateGameReturnValue = {
  gameId: string;
  player: string;
  stakedAmount: string;
  guess: number;
  feeRate: number;
  startedAt: number;
};

export const decodeCreateGame = (
  txReceipt: any,
  provider: Provider,
  timestamp: number,
): CreateGameReturnValue => {
  const contract = new Contract(
    ABIS.StarkFlipAbi,
    formattedContractAddress(txReceipt.events[0].from_address),
    provider,
  );

  const parsedEvent =
    contract.parseEvents(txReceipt)[0][
      'starkflip::starkflip::StarkFlip::StarkFlip::CreateGame'
    ];

  const returnValue: CreateGameReturnValue = {
    gameId: num.toHex(parsedEvent.id as BigNumberish),
    player: formattedContractAddress(
      num.toHex(parsedEvent.player as BigNumberish),
    ),
    stakedAmount: (parsedEvent.staked as BigNumberish).toString(),
    guess: Number(parsedEvent.guess as BigNumberish),
    feeRate: Number(parsedEvent.fee_rate as BigNumberish),
    startedAt: timestamp,
  };

  return returnValue;
};

export type SettleGameReturnValue = {
  gameId: string;
  player: string;
  isWon: boolean;
  stakedAmount: string;
  settledAt: number;
};

export const decodeSettleGame = (
  txReceipt: any,
  provider: Provider,
  timestamp: number,
): SettleGameReturnValue => {
  const contract = new Contract(
    ABIS.StarkFlipAbi,
    formattedContractAddress(txReceipt.events[0].from_address),
    provider,
  );

  const parsedEvent =
    contract.parseEvents(txReceipt)[0][
      'starkflip::starkflip::StarkFlip::StarkFlip::SettleGame'
    ];
  const returnValue: SettleGameReturnValue = {
    gameId: num.toHex(parsedEvent.game_id as BigNumberish),
    player: formattedContractAddress(
      num.toHex(parsedEvent.player as BigNumberish),
    ),
    isWon: parsedEvent.is_won as any,
    stakedAmount: (parsedEvent.staked_amount as BigNumberish).toString(),
    settledAt: timestamp,
  };

  return returnValue;
};

export type TicketCreatedReturnValue = {
  ticketId: number;
  user: string;
  lotteryAddress: string;
  lotteryId: number;
  pickedNumbers: number[];
  boughtTime: number;
};
export const decodeTicketCreated = (
  txReceipt: any,
  provider: Provider,
  timestamp: number,
): TicketCreatedReturnValue => {
  const contract = new Contract(
    ABIS.TicketABI,
    formattedContractAddress(txReceipt.events[0].from_address),
    provider,
  );
  const parsedEvent = contract.parseEvents(txReceipt)[0];
  const returnValue: TicketCreatedReturnValue = {
    ticketId: Number((parsedEvent.TicketCreated.ticketId as bigint).toString()),
    user: formattedContractAddress(
      num.toHex(parsedEvent.TicketCreated.user as BigNumberish),
    ),
    lotteryAddress: formattedContractAddress(
      num.toHex(parsedEvent.TicketCreated.lotteryAddress as BigNumberish),
    ),
    lotteryId: Number(
      (parsedEvent.TicketCreated.lotteryId as bigint).toString(),
    ),
    pickedNumbers: (parsedEvent.TicketCreated.pickedNumbers as bigint[]).map(
      (value) => Number(value.toString()),
    ),
    boughtTime: timestamp,
  };

  return returnValue;
};

export type NewLotteryStartReturnValue = {
  id: number;
  startTime: number;
  drawTime: number;
  jackpot: number;
};

export const decodeNewLotteryStarted = (
  txReceipt: any,
  provider: Provider,
): NewLotteryStartReturnValue => {
  const contract = new Contract(
    ABIS.LotteryABI,
    formattedContractAddress(txReceipt.events[0].from_address),
    provider,
  );
  const parsedEvent = contract.parseEvents(txReceipt)[0];
  const lotteryId = Number(
    (parsedEvent.StartNewLottery.id as bigint).toString(),
  );
  const returnValue: NewLotteryStartReturnValue = {
    id: lotteryId,
    startTime:
      Number((parsedEvent.StartNewLottery.startTime as bigint).toString()) *
      1e3,
    drawTime:
      Number((parsedEvent.StartNewLottery.drawTime as bigint).toString()) * 1e3,
    jackpot:
      Number((parsedEvent.StartNewLottery.jackpot as bigint).toString()) / 1e18,
  };

  return returnValue;
};

export type DrawnNumbersReturnValue = {
  lotteryId: number;
  drawnNumber: number[];
};

export const decodeDrawnNumbersReturnValue = (
  txReceipt: any,
  provider: Provider,
): DrawnNumbersReturnValue => {
  const contract = new Contract(
    ABIS.LotteryABI,
    formattedContractAddress(txReceipt.events[0].from_address),
    provider,
  );

  const parsedEvent = contract.parseEvents(txReceipt)[0];
  const returnValue: DrawnNumbersReturnValue = {
    lotteryId: Number(
      (parsedEvent.DrawnNumbers.lotteryId as bigint).toString(),
    ),
    drawnNumber: (parsedEvent.DrawnNumbers.drawnNumbers as bigint[]).map(
      (value) => Number(value.toString()),
    ),
  };

  return returnValue;
};

export type WithdrawWinningReturnValue = {
  userAddress: string;
  lottery: string;
  lotteryId: number;
  ticketId: number;
  payout: number;
};

export const decodeWithdrawWinningReturnValue = (
  txReceipt: any,
  provider: Provider,
): WithdrawWinningReturnValue => {
  const contract = new Contract(
    ABIS.LotteryABI,
    formattedContractAddress(txReceipt.events[0].from_address),
    provider,
  );

  const parsedEvent = contract.parseEvents(txReceipt)[0];
  const returnValue: WithdrawWinningReturnValue = {
    userAddress: formattedContractAddress(
      num.toHex(parsedEvent.WithdrawWinning.userAddress as BigNumberish),
    ),
    lottery: formattedContractAddress(
      num.toHex(parsedEvent.WithdrawWinning.lottery as BigNumberish),
    ),
    lotteryId: Number(
      (parsedEvent.WithdrawWinning.lotteryId as bigint).toString(),
    ),
    ticketId: Number(
      (parsedEvent.WithdrawWinning.ticketId as bigint).toString(),
    ),
    payout: Number((parsedEvent.WithdrawWinning.payout as bigint).toString()),
  };

  return returnValue;
};
