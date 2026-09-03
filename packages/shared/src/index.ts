// packages/shared/src/index.ts
export type LiquidColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
const COLORS: LiquidColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const BOTTLE_CAPACITY = 4;

export type Bottle = LiquidColor[];
export type Move = [fromIndex: number, toIndex: number];

// --- Seeded PRNG (mulberry32) ---
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Generation ---
export function generatePuzzle(seed: number, numBottles: number = 6, numColors: number = 3): Bottle[] {
  const rand = mulberry32(seed);
  const totalSlots = numBottles * BOTTLE_CAPACITY;
  const usedSlots = numColors * BOTTLE_CAPACITY; // Each color fills exactly one bottle
  const emptySlots = totalSlots - usedSlots;
  const emptyBottles = Math.floor(emptySlots / BOTTLE_CAPACITY);

  // Create pool of liquids
  let pool: LiquidColor[] = [];
  for (let i = 0; i < numColors; i++) {
    for (let j = 0; j < BOTTLE_CAPACITY; j++) {
      pool.push(COLORS[i % COLORS.length]);
    }
  }
  // Shuffle pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const bottles: Bottle[] = [];
  let poolIdx = 0;
  const totalBottles = numColors + emptyBottles;

  for (let i = 0; i < totalBottles; i++) {
    const bottle: Bottle = [];
    const isFull = i < numColors;
    for (let j = 0; j < BOTTLE_CAPACITY; j++) {
      if (isFull) {
        bottle.push(pool[poolIdx++]);
      } else {
        bottle.push(null as any); // empty slot
      }
    }
    bottles.push(bottle.filter(l => l !== null) as Bottle);
  }
  return bottles;
}

// --- Validation & Logic ---
export function getTopLiquid(bottle: Bottle): LiquidColor | null {
  return bottle.length > 0 ? bottle[bottle.length - 1] : null;
}

export function isBottleEmpty(bottle: Bottle): boolean {
  return bottle.length === 0;
}

export function isBottleFull(bottle: Bottle): boolean {
  return bottle.length === BOTTLE_CAPACITY;
}

export function isBottleComplete(bottle: Bottle): boolean {
  if (bottle.length !== BOTTLE_CAPACITY) return false;
  return bottle.every(color => color === bottle[0]);
}

export function isValidPour(state: Bottle[], fromIdx: number, toIdx: number): boolean {
  if (fromIdx === toIdx) return false;
  const from = state[fromIdx];
  const to = state[toIdx];
  if (isBottleEmpty(from)) return false;
  if (isBottleComplete(from)) return false;
  if (isBottleFull(to)) return false;
  if (isBottleEmpty(to)) return true;
  return getTopLiquid(from) === getTopLiquid(to);
}

export function pour(state: Bottle[], fromIdx: number, toIdx: number): Bottle[] {
  if (!isValidPour(state, fromIdx, toIdx)) return state;

  const newState = state.map(b => [...b]);
  const from = newState[fromIdx];
  const to = newState[toIdx];
  const topColor = getTopLiquid(from)!;

  // Count how many of the same color are on top of 'from'
  let count = 0;
  for (let i = from.length - 1; i >= 0; i--) {
    if (from[i] === topColor) count++;
    else break;
  }

  // How many can we pour into 'to'?
  const space = BOTTLE_CAPACITY - to.length;
  const pourCount = Math.min(count, space);

  // Remove from source
  const removed = from.splice(from.length - pourCount, pourCount);
  // Add to target
  to.push(...removed);

  return newState;
}

export function replayMoves(initialState: Bottle[], moves: Move[]): Bottle[] {
  return moves.reduce((state, [fromIdx, toIdx]) => pour(state, fromIdx, toIdx), initialState);
}

export function checkWin(state: Bottle[]): boolean {
  return state.every(bottle => isBottleEmpty(bottle) || isBottleComplete(bottle));
}