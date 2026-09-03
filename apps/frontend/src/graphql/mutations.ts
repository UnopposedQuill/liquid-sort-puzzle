import { gql } from '@apollo/client';

export const SUBMIT_ATTEMPT = gql`
  mutation SubmitAttempt($seed: Int!, $moves: [[Int!]!]!, $timeMs: Int!) {
    submitAttempt(seed: $seed, moves: $moves, timeMs: $timeMs) {
      success
      score
      message
    }
  }
`;
