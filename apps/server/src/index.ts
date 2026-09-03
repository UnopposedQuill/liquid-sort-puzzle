import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { generatePuzzle, replayMoves, checkWin, Move, Bottle } from '@liquid-sort/shared';

const typeDefs = `#graphql
  type SubmitResponse {
    success: Boolean!
    score: Int
    message: String
  }

  type Mutation {
    submitAttempt(seed: Int!, moves: [[Int!]!]!, timeMs: Int!, numBottles: Int!, numColors: Int!): SubmitResponse!
  }

  type Query {
    _dummy: String
  }
`;

const resolvers = {
  Mutation: {
    submitAttempt: async (_: any, { seed, moves, timeMs, numBottles, numColors }: { seed: number; moves: Move[]; timeMs: number; numBottles: number; numColors: number }) => {
      try {
        // 1. Rehydrate the EXACT same puzzle using the seed (deterministic now!)
        const initialBottles: Bottle[] = generatePuzzle(seed, numBottles, numColors);

        // 2. Replay the exact moves from the client using the shared logic
        const finalState = replayMoves(initialBottles, moves);

        // 3. Verify if the final state is actually solved
        const isValid = checkWin(finalState);

        if (!isValid) {
          return {
            success: false,
            score: 0,
            message: 'Invalid move sequence detected. Cheating detected!'
          };
        }

        // 4. Calculate score: fewer moves + faster time = higher score
        const score = Math.max(0, 1000 - moves.length * 5 - Math.floor(timeMs / 1000));

        // 5. (Optional) Save to leaderboard here

        return {
          success: true,
          score,
          message: `Valid puzzle solved! Score: ${score}`
        };
      } catch (error) {
        console.error('Server error:', error);
        return {
          success: false,
          score: 0,
          message: 'Server error processing attempt.'
        };
      }
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });

const start = async () => {
  const { url } = await startStandaloneServer(server, { listen: { port: 4000, host: '0.0.0.0' } });
  console.log(`🚀 Apollo Server ready at ${url}`);
};

start();