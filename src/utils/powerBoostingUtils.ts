import { getTimestampInSeconds } from './utils';

const firstGivbackRoundTimeStamp = Number(
  process.env.FIRST_GIVBACK_ROUND_TIME_STAMP,
);

const givbackRoundLength = Number(process.env.GIVPOWER_ROUND_DURATION);

export const getRoundNumberByDate = (
  date: Date,
): {
  round: number;
  fromTimestamp: number;
  toTimestamp: number;
} => {
  const now = getTimestampInSeconds(date);

  const round =
    Math.floor((now - firstGivbackRoundTimeStamp) / givbackRoundLength) + 1;

  const fromTimestamp =
    (round - 1) * givbackRoundLength + firstGivbackRoundTimeStamp;
  const toTimestamp = round * givbackRoundLength + firstGivbackRoundTimeStamp;
  return {
    round,
    fromTimestamp,
    toTimestamp,
  };
};

export const getRoundDatesByNumber = (
  round: number,
): {
  round: number;
  fromTimestamp: number;
  toTimestamp: number;
} => {
  const fromTimestamp =
    (round - 1) * givbackRoundLength + firstGivbackRoundTimeStamp;
  const toTimestamp = round * givbackRoundLength + firstGivbackRoundTimeStamp;
  return {
    round,
    fromTimestamp,
    toTimestamp,
  };
};
