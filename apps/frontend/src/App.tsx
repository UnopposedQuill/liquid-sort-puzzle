// apps/frontend/src/App.tsx
import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  generatePuzzle, pour, checkWin, isValidPour,
  type Bottle,
  type Move,
} from '@liquid-sort/shared';
import { SUBMIT_ATTEMPT } from './graphql/mutations';
import './App.css';

const colorMap: Record<string, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  green: '#2ecc71',
  yellow: '#f1c40f',
  purple: '#9b59b6',
  orange: '#e67e22',
};

function BottleComponent({ liquids, onClick, isSelected }: {
  liquids: Bottle;
  onClick: () => void;
  isSelected: boolean;
}) {
  const display = [...liquids];
  while (display.length < 4) display.push(null as any);
  return (
    <div
      onClick={onClick}
      style={{
        width: '50px', height: '160px',
        border: `3px solid ${isSelected ? 'gold' : '#333'}`,
        borderRadius: '0 0 12px 12px',
        display: 'flex', flexDirection: 'column-reverse',
        overflow: 'hidden', background: '#ecf0f1',
        cursor: 'pointer', transition: 'border 0.2s'
      }}
    >
      {display.map((color, idx) => (
        <div key={idx} style={{
          flex: 1, width: '100%',
          background: color ? colorMap[color] : 'transparent',
          borderBottom: color ? '1px solid rgba(0,0,0,0.15)' : 'none'
        }} />
      ))}
    </div>
  );
}

const MIN_BOTTLES = 3;
const MIN_EMPTY = 1;
// Colors beyond the 6-entry palette (see colorMap) wrap around and get a
// bigger quota (e.g. 8 colors on a 6-color palette means two colors each
// need 2 bottles to fully sort) rather than erroring — harder, not broken.

function App() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [seed, setSeed] = useState(0);
  const [win, setWin] = useState(false);
  const [numBottles, setNumBottles] = useState(6);
  const [numEmpty, setNumEmpty] = useState(2);

  const [submitAttempt] = useMutation(SUBMIT_ATTEMPT);

  const initGame = (bottleCount: number, emptyCount: number) => {
    const numColors = Math.max(1, bottleCount - emptyCount);
    const newSeed = Math.floor(Math.random() * 1000000);
    setSeed(newSeed);
    const newBottles = generatePuzzle(newSeed, bottleCount, numColors);
    setBottles(newBottles);
    setSelected(null);
    setMoveHistory([]);
    setWin(false);
  };

  useEffect(() => { initGame(numBottles, numEmpty); }, [numBottles, numEmpty]);

  const handleBottleClick = (idx: number) => {
    if (win) return;
    if (selected === null) {
      if (bottles[idx].length > 0) setSelected(idx);
      return;
    }
    if (selected === idx) { setSelected(null); return; }

    if (isValidPour(bottles, selected, idx)) {
      const newBottles = pour(bottles, selected, idx);
      const newHistory: Move[] = [...moveHistory, [selected, idx]];
      setBottles(newBottles);
      setMoveHistory(newHistory);
      setSelected(null);

      if (checkWin(newBottles)) {
        setWin(true);
        const timeMs = Date.now() - startTime;
        submitAttempt({
          variables: { seed, moves: newHistory, timeMs }
        }).then(res => {
          console.log('Server response:', res.data);
        }).catch(err => console.error('Server error:', err));
      }
    } else {
      setSelected(idx);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', height: '100vh', background: '#2c3e50' }}>
      <h1 style={{ color: 'white' }}>Liquid Sort</h1>
      {win && <h2 style={{ color: 'gold' }}>✨ You Win! ✨</h2>}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '30px' }}>
        {bottles.map((bottle, idx) => (
          <BottleComponent
            key={idx}
            liquids={bottle}
            isSelected={selected === idx}
            onClick={() => handleBottleClick(idx)}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '40px' }}>
        <button onClick={() => initGame(numBottles, numEmpty)} style={{ padding: '12px 30px', fontSize: '16px', cursor: 'pointer' }}>
          New Game
        </button>
        <label style={{ color: 'white', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Bottles:
          <input
            type="number"
            min={MIN_BOTTLES}
            value={numBottles}
            onChange={(e) => {
              const next = Math.max(MIN_BOTTLES, Number(e.target.value) || MIN_BOTTLES);
              setNumBottles(next);
            }}
            style={{ width: '50px', padding: '6px', fontSize: '14px' }}
          />
        </label>
        <label style={{ color: 'white', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Empty:
          <input
            type="number"
            min={MIN_EMPTY}
            value={numEmpty}
            onChange={(e) => {
              const next = Math.max(MIN_EMPTY, Number(e.target.value) || MIN_EMPTY);
              setNumEmpty(next);
            }}
            style={{ width: '50px', padding: '6px', fontSize: '14px' }}
          />
        </label>
      </div>
      <div style={{ color: '#aaa', marginTop: '10px', fontSize: '14px' }}>Moves: {moveHistory.length}</div>
    </div>
  );
}

export default App;