// apps/frontend/src/App.tsx
import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  generatePuzzle, pour, checkWin, isValidPour,
  type Bottle,
  type Move,
} from '@liquid-sort/shared';
import { SUBMIT_ATTEMPT, type SubmitAttemptData, type SubmitAttemptVars } from './graphql/mutations';
import './App.css';

const colorMap: Record<string, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  green: '#2ecc71',
  yellow: '#f1c40f',
  purple: '#9b59b6',
  orange: '#e67e22',
};

// Width and gap stay fixed so the shelf keeps six aligned columns at every
// size -- that regular grid is a lot of what makes the board readable. Only
// the height shrinks, and only as far as the number of rows requires, so the
// tallest board (4 rows) still fits without scrolling.
function bottleSize(count: number) {
  const rows = Math.ceil(count / BOTTLES_PER_ROW);
  const height = rows <= 1 ? 170 : rows === 2 ? 158 : rows === 3 ? 138 : 114;
  return { width: 50, height, gap: 10 };
}

function BottleComponent({ liquids, onClick, isSelected, width, height }: {
  liquids: Bottle;
  onClick: () => void;
  isSelected: boolean;
  width: number;
  height: number;
}) {
  const display = [...liquids];
  while (display.length < 4) display.push(null as any);
  return (
    <div
      onClick={onClick}
      style={{
        width: `${width}px`, height: `${height}px`, flex: '0 0 auto',
        // Without this the 3px border widens each bottle to 56px and only five
        // fit per row instead of six.
        boxSizing: 'border-box',
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

// The board is a shelf: a fixed number of bottles per row, wrapping downward.
// Four rows is about as much as stays readable and reachable on a phone, so the
// shelf dimensions set the ceiling rather than any colour-count reasoning.
const BOTTLES_PER_ROW = 6;
const MAX_ROWS = 4;

const MIN_BOTTLES = 3;
const MAX_BOTTLES = BOTTLES_PER_ROW * MAX_ROWS;
const MIN_EMPTY = 1;
// The empty ceiling is simply bottles - 1: there must be at least one bottle
// with something in it, and nothing beyond that needs enforcing.

const stepButtonStyle = (disabled: boolean) => ({
  width: '36px',
  height: '36px',
  fontSize: '19px',
  lineHeight: 1,
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.35 : 1,
});

// A count control offering both editing gestures the game needs:
//   - the -/+ buttons nudge by one. Android's numeric IME has no arrow keys
//     and a WebView renders no spinner for type="number", so without these
//     there is no way to adjust a value by hand at all.
//   - the text field takes a value directly, for jumping between very
//     different difficulties in one go. It focuses select-all so typing
//     replaces rather than appends.
//
// The draft is kept as a string so the field can be transiently empty or
// partial while typing, and is parsed/clamped/committed only on blur or
// Enter. Clamping on every keystroke is what made this uneditable before:
// deleting the last digit refilled the field with the minimum instantly, so
// the value could never be cleared and retyped.
function CountStepper({ label, value, min, max, onCommit }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (next: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);

  // Track committed changes made elsewhere: the -/+ buttons, or a clamp
  // forced by the sibling control (fewer bottles can shrink the empty count).
  // Adjusted during render rather than in an effect -- React re-runs this
  // component immediately without committing the stale draft to the DOM.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
  }

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const commitDraft = () => {
    const parsed = Number.parseInt(draft, 10);
    // An empty or unparseable field reverts to the last committed value
    // rather than silently becoming the minimum.
    const next = Number.isNaN(parsed) ? value : clamp(parsed);
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  const step = (delta: number) => {
    const next = clamp(value + delta);
    if (next !== value) onCommit(next);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: 'white', fontSize: '13px' }}>{label}:</span>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => step(-1)}
        style={stepButtonStyle(value <= min)}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        value={draft}
        onFocus={(e) => e.currentTarget.select()}
        // Digits only, capped at two so a stray keypress can't build a huge
        // number; the real bound is applied by clamp() on commit.
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
        onBlur={commitDraft}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        // 16px keeps mobile browsers from zooming in on focus.
        style={{ width: '42px', padding: '6px', fontSize: '16px', textAlign: 'center', boxSizing: 'border-box' }}
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => step(1)}
        style={stepButtonStyle(value >= max)}
      >
        +
      </button>
    </div>
  );
}
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
  const [numColors, setNumColors] = useState(4);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [submitResult, setSubmitResult] = useState<{ score?: number | null; message?: string | null } | null>(null);

  const [submitAttempt] = useMutation<SubmitAttemptData, SubmitAttemptVars>(SUBMIT_ATTEMPT);

  const initGame = (bottleCount: number, emptyCount: number) => {
    const colors = Math.max(1, bottleCount - emptyCount);
    setNumColors(colors);
    const newSeed = Math.floor(Math.random() * 1000000);
    setSeed(newSeed);
    const newBottles = generatePuzzle(newSeed, bottleCount, colors);
    setBottles(newBottles);
    setSelected(null);
    setMoveHistory([]);
    setWin(false);
    setSubmitStatus('idle');
    setSubmitResult(null);
  };

  // Generate the first puzzle once. Regeneration is deliberate from here on
  // (New Game, or committing a count change). This used to run on every
  // keystroke, so a half-typed number destroyed the game in progress.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { initGame(numBottles, numEmpty); }, []);

  const handleBottlesCommit = (next: number) => {
    // Every puzzle needs at least one colour, so empties must stay below the
    // bottle count when the count shrinks.
    const empty = Math.min(numEmpty, next - 1);
    setNumBottles(next);
    setNumEmpty(empty);
    initGame(next, empty);
  };

  const sizing = bottleSize(bottles.length);

  const handleEmptyCommit = (next: number) => {
    setNumEmpty(next);
    initGame(numBottles, next);
  };

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
        setSubmitStatus('pending');
        const timeMs = Date.now() - startTime;
        submitAttempt({
          variables: { seed, moves: newHistory, timeMs, numBottles, numColors }
        }).then(res => {
          setSubmitStatus('success');
          setSubmitResult(res.data?.submitAttempt ?? null);
        }).catch(err => {
          console.error('Server error:', err);
          setSubmitStatus('failed');
        });
      }
    } else {
      setSelected(idx);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      // Tight side padding: the two count rows only fit side by side if the
      // content box keeps ~365px on a 393px-wide phone.
      padding: '16px 10px 8px', background: '#2c3e50',
      // dvh follows the visible viewport when the keyboard opens; border-box
      // keeps the 20px padding inside it rather than 40px past the screen.
      height: '100dvh', boxSizing: 'border-box',
      // The document must never scroll: with touch scrolling disabled for the
      // game, a focus-driven scrollIntoView would move content off-screen with
      // no way to bring it back. Only the board below scrolls.
      overflow: 'hidden',
    }}>
      <h1 style={{ color: 'white', margin: '0 0 8px', flex: '0 0 auto' }}>Liquid Sort</h1>
      {win && <h2 style={{ color: 'gold' }}>✨ You Win! ✨</h2>}
      {submitStatus === 'pending' && <div style={{ color: '#aaa', fontSize: '14px' }}>Submitting score...</div>}
      {submitStatus === 'success' && (
        <div style={{ color: '#2ecc71', fontSize: '14px' }}>
          {submitResult?.message ?? `Score: ${submitResult?.score}`}
        </div>
      )}
      {submitStatus === 'failed' && (
        <div style={{ color: '#e67e22', fontSize: '14px' }}>
          ⚠️ Offline — score not submitted
        </div>
      )}
      <div style={{
        display: 'flex', gap: `${sizing.gap}px`, flexWrap: 'wrap', justifyContent: 'center',
        alignContent: 'flex-start', marginTop: '20px', width: '100%',
        // Takes the space the header and controls don't. min-height:0 lets a
        // flex child actually shrink below its content size, which is what
        // makes overflow-y work here at all.
        flex: '1 1 auto', minHeight: 0, overflowY: 'auto',
        // Re-enable vertical panning; the global rule sets touch-action:none
        // to stop the page bouncing while pouring.
        touchAction: 'pan-y',
      }}>
        {bottles.map((bottle, idx) => (
          <BottleComponent
            key={idx}
            liquids={bottle}
            isSelected={selected === idx}
            onClick={() => handleBottleClick(idx)}
            width={sizing.width}
            height={sizing.height}
          />
        ))}
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '12px', marginTop: '18px', marginBottom: '4px', flex: '0 0 auto',
      }}>
        <button onClick={() => initGame(numBottles, numEmpty)} style={{ padding: '11px 30px', fontSize: '16px', cursor: 'pointer' }}>
          New Game
        </button>
        {/* Both counts share a row: two stacked rows of controls cost the
            board a whole row of bottles on a phone screen. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <CountStepper
          label="Bottles"
          value={numBottles}
          min={Math.max(MIN_BOTTLES, numEmpty + 1)}
          max={MAX_BOTTLES}
          onCommit={handleBottlesCommit}
        />
        <CountStepper
          label="Empty"
          value={numEmpty}
          min={MIN_EMPTY}
          max={numBottles - 1}
          onCommit={handleEmptyCommit}
        />
        </div>
      </div>
      <div style={{ color: '#aaa', marginTop: '10px', fontSize: '14px', flex: '0 0 auto' }}>Moves: {moveHistory.length}</div>
    </div>
  );
}

export default App;