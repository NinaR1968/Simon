import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import confetti from 'canvas-confetti';
import App from './App';
import { randomColor } from './game/random';
import { playLose, playWin, startTone, stopAll, unlockAudio } from './audio/audioEngine';
import type { ColorId } from './game/colors';

vi.mock('./audio/audioEngine', () => ({
  unlockAudio: vi.fn(),
  startTone: vi.fn(),
  playWin: vi.fn(),
  playLose: vi.fn(),
  stopAll: vi.fn(),
}));
vi.mock('./game/random', () => ({ randomColor: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { reset: vi.fn() }) }));

const LABEL: Record<ColorId, string> = { green: 'ירוק', red: 'אדום', yellow: 'צהוב', blue: 'כחול' };

// randomColor is drawn on start and on every press; only the last press of a round uses it.
function randomQueue(seq: ColorId[]): ColorId[] {
  const queue: ColorId[] = [seq[0]];
  for (let round = 1; round < seq.length; round++) {
    queue.push(...Array<ColorId>(round - 1).fill('green'), seq[round]);
  }
  return queue;
}

describe('App shell', () => {
  it('renders the home screen with board, stage and start button', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'סיימון' })).toBeInTheDocument();
    expect(screen.getByText(/שלב/)).toHaveTextContent('שלב 1 מתוך 10');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });

  it('renders the four quadrants in their spatial positions', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'ירוק' })).toHaveClass('quadrant-top-left');
    expect(screen.getByRole('button', { name: 'אדום' })).toHaveClass('quadrant-top-right');
    expect(screen.getByRole('button', { name: 'צהוב' })).toHaveClass('quadrant-bottom-left');
    expect(screen.getByRole('button', { name: 'כחול' })).toHaveClass('quadrant-bottom-right');
  });

  it('navigates between home and about without a third screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nav = screen.getByRole('navigation', { name: 'ניווט ראשי' });
    expect(nav.querySelectorAll('button')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'אודות' }));
    expect(screen.getByRole('heading', { name: 'על המשחק' })).toBeInTheDocument();
    expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ירוק' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'אודות' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: 'בית' }));
    expect(screen.getByRole('button', { name: 'ירוק' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'בית' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('Game flow', () => {
  let colors: ColorId[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(unlockAudio).mockResolvedValue(true);
    vi.mocked(startTone).mockReturnValue(() => {});
    colors = [];
    vi.mocked(randomColor).mockImplementation(() => colors.shift() ?? 'green');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
  const stage = () => screen.getByText(/מתוך/).textContent;
  const quadrant = (c: ColorId) => screen.getByRole('button', { name: LABEL[c] });
  const showTime = (n: number) => n * 600 + (n - 1) * 250;

  async function press(c: ColorId) {
    fireEvent.pointerDown(quadrant(c));
    fireEvent.pointerUp(window);
    await advance(0);
  }

  async function startGame() {
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
    await advance(0);
  }

  // Plays the given sequence back, then waits through the next-round lead-in and presentation.
  async function playRound(seq: ColorId[]) {
    for (const c of seq) await press(c);
  }

  it('shows the sequence with input blocked, then hands the turn to the player', async () => {
    colors = ['red'];
    render(<App />);
    await startGame();

    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(quadrant('red')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();

    await advance(1000);
    expect(quadrant('red')).toHaveClass('quadrant--lit');
    expect(startTone).toHaveBeenCalledWith('red');

    // A press during presentation has no effect.
    fireEvent.pointerDown(quadrant('blue'));
    await advance(600);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    expect(screen.getByText('הקש על הצבעים לפי הסדר')).toBeInTheDocument();
    expect(quadrant('red')).not.toHaveClass('quadrant--lit');
    expect(quadrant('red')).toBeEnabled();
  });

  it('holds the completed round for 1s, then shows the next round and a sequence of 2', async () => {
    colors = randomQueue(['green', 'blue']);
    render(<App />);
    await startGame();
    await advance(1000 + showTime(1));

    await press('green');
    expect(stage()).toBe('שלב 1 מתוך 10');
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    await advance(1000);
    expect(stage()).toBe('שלב 2 מתוך 10');

    vi.mocked(startTone).mockClear();
    await advance(1000 + showTime(2));
    expect(vi.mocked(startTone).mock.calls.map((c) => c[0])).toEqual(['green', 'blue']);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  });

  it('loses on the first wrong press in round 1 with 0 completed rounds and no confetti', async () => {
    colors = ['green'];
    render(<App />);
    await startGame();
    await advance(1000 + showTime(1));

    vi.mocked(startTone).mockClear();
    await press('red');
    expect(startTone).toHaveBeenCalledWith('red'); // pressed tone plays immediately
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(playLose).not.toHaveBeenCalled();

    await advance(1000);
    expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!');
    expect(screen.getByRole('dialog')).toHaveTextContent('השלמת 0 שלבים');
    expect(playLose).toHaveBeenCalledTimes(1);
    expect(playWin).not.toHaveBeenCalled();
    expect(confetti).not.toHaveBeenCalled();
    expect(stage()).toBe('שלב 1 מתוך 10');
  });

  it('reports completed rounds when losing on a later round', async () => {
    colors = randomQueue(['green', 'red', 'yellow']);
    render(<App />);
    await startGame();
    await advance(1000 + showTime(1));
    await playRound(['green']);
    await advance(2000 + showTime(2));
    await playRound(['green', 'red']);
    await advance(2000 + showTime(3));

    await press('green');
    await press('blue');
    await advance(1000);
    expect(stage()).toBe('שלב 3 מתוך 10');
    expect(screen.getByRole('dialog')).toHaveTextContent('השלמת 2 שלבים');
  });

  it('wins after round 10 with confetti, then "אישור" returns to start and a new game uses a new sequence', async () => {
    const seq: ColorId[] = ['green', 'red', 'yellow', 'blue', 'green', 'red', 'yellow', 'blue', 'green', 'red'];
    colors = randomQueue(seq);
    render(<App />);
    await startGame();
    await advance(1000 + showTime(1));

    for (let round = 1; round <= 10; round++) {
      expect(stage()).toBe(`שלב ${round} מתוך 10`);
      await playRound(seq.slice(0, round));
      if (round < 10) await advance(2000 + showTime(round + 1));
    }

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await advance(1000);
    expect(screen.getByRole('dialog')).toHaveTextContent('כל הכבוד! ניצחת!');
    expect(playWin).toHaveBeenCalledTimes(1);
    expect(playLose).not.toHaveBeenCalled();
    expect(confetti).toHaveBeenCalled();
    expect(stage()).toBe('שלב 10 מתוך 10');

    // No round 11: further presses do nothing.
    expect(quadrant('green')).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(stage()).toBe('שלב 1 מתוך 10');

    colors = ['blue'];
    vi.mocked(startTone).mockClear();
    await startGame();
    await advance(1000 + showTime(1));
    expect(vi.mocked(startTone).mock.calls.map((c) => c[0])).toEqual(['blue']);
  });

  it('navigating to About mid-game leaves no light, sound or timer and returns to the start state', async () => {
    colors = ['green'];
    render(<App />);
    await startGame();
    await advance(1300); // mid-presentation

    fireEvent.click(screen.getByRole('button', { name: 'אודות' }));
    await advance(0);
    expect(stopAll).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'בית' }));
    expect(stage()).toBe('שלב 1 מתוך 10');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(document.querySelector('.quadrant--lit')).toBeNull();
  });

  it('stays idle with a message when audio cannot start', async () => {
    vi.mocked(unlockAudio).mockResolvedValue(false);
    render(<App />);
    await startGame();
    expect(screen.getByText(/לא ניתן להפעיל צליל/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    await advance(5000);
    expect(startTone).not.toHaveBeenCalled();
  });
});
