import { gql } from '@apollo/client';

export interface SubmitAttemptData {
  submitAttempt: {
    success: boolean;
    score: number | null;
    message: string | null;
  };
}

export interface SubmitAttemptVars {
  seed: number;
  moves: [number, number][];
  timeMs: number;
  numBottles: number;
  numColors: number;
}

export const SUBMIT_ATTEMPT = gql`
  mutation SubmitAttempt($seed: Int!, $moves: [[Int!]!]!, $timeMs: Int!, $numBottles: Int!, $numColors: Int!) {
    submitAttempt(seed: $seed, moves: $moves, timeMs: $timeMs, numBottles: $numBottles, numColors: $numColors) {
      success
      score
      message
    }
  }
`;
