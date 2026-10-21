import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import confetti from 'canvas-confetti';
import App from './App';
import { randomColor } from './game/random';
import { playLose, playWin, startTone, stopAll, unlockAudio } from './audio/audioEngine';
import type { ColorId } from './game/colors';
import { HISTORY_KEY, createResult, type GameResult } from './history/historyStorage';

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

  describe('pause and resume', () => {
    const goAbout = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'אודות' }));
      await advance(0);
    };
    const goHome = () => fireEvent.click(screen.getByRole('button', { name: 'בית' }));
    const resumeButton = () => screen.queryByRole('button', { name: 'המשך משחק' });
    const tones = () => vi.mocked(startTone).mock.calls.map((c) => c[0]);
    const clickResume = async () => {
      fireEvent.click(resumeButton()!);
      await advance(0);
    };

    function setVisibility(state: DocumentVisibilityState) {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
      document.dispatchEvent(new Event('visibilitychange'));
    }

    afterEach(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    });

    // Reaches round 2 with the player's turn open.
    async function reachRound2Input(seq: ColorId[]) {
      colors = randomQueue(seq);
      render(<App />);
      await startGame();
      await advance(1000 + showTime(1));
      await playRound([seq[0]]);
      await advance(2000 + showTime(2));
      expect(screen.getByText('התור שלך')).toBeInTheDocument();
    }

    it('navigating to About mid-presentation pauses with no light, sound or timer, and never auto-resumes', async () => {
      colors = ['green'];
      render(<App />);
      await startGame();
      await advance(1300); // green is lit

      await goAbout();
      expect(stopAll).toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);

      goHome();
      expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();
      expect(resumeButton()).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();
      expect(document.querySelector('.quadrant--lit')).toBeNull();
      expect(document.querySelector('.board--dimmed')).not.toBeNull();
      expect(quadrant('green')).toBeDisabled();
      expect(stage()).toBe('שלב 1 מתוך 10');

      vi.mocked(startTone).mockClear();
      await advance(5000);
      expect(startTone).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('resume replays the full sequence of the same round after partial input, then input restarts', async () => {
      await reachRound2Input(['green', 'blue']);
      await press('green'); // partial input

      await goAbout();
      goHome();
      expect(stage()).toBe('שלב 2 מתוך 10');

      vi.mocked(startTone).mockClear();
      await clickResume();
      expect(resumeButton()).not.toBeInTheDocument();
      expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
      await advance(1000 + showTime(2));
      expect(tones()).toEqual(['green', 'blue']);
      expect(stage()).toBe('שלב 2 מתוך 10');
      expect(screen.getByText('התור שלך')).toBeInTheDocument();

      // Input starts over: the full sequence completes the round.
      await playRound(['green', 'blue']);
      await advance(1000);
      expect(stage()).toBe('שלב 3 מתוך 10');
    });

    it('after resume, continuing from the old partial input is a mistake', async () => {
      await reachRound2Input(['green', 'blue']);
      await press('green');
      await goAbout();
      goHome();
      await clickResume();
      await advance(1000 + showTime(2));

      await press('blue');
      await advance(1000);
      expect(screen.getByRole('dialog')).toHaveTextContent('השלמת שלב אחד');
    });

    it('hiding the app pauses; becoming visible again does not resume (also on pagehide)', async () => {
      colors = ['green'];
      render(<App />);
      await startGame();
      await advance(1300);

      setVisibility('hidden');
      await advance(0);
      expect(stopAll).toHaveBeenCalled();
      expect(document.querySelector('.quadrant--lit')).toBeNull();
      setVisibility('visible');
      await advance(5000);
      expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();

      await clickResume();
      await advance(1000 + showTime(1));
      expect(screen.getByText('התור שלך')).toBeInTheDocument();

      window.dispatchEvent(new Event('pagehide'));
      await advance(0);
      expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();
    });

    it('leaving right after a wrong press does not pause; the result shows on return', async () => {
      colors = ['green'];
      render(<App />);
      await startGame();
      await advance(1000 + showTime(1));
      await press('red');

      await goAbout();
      setVisibility('hidden');
      await advance(1000);
      setVisibility('visible');
      goHome();
      expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!');
      expect(resumeButton()).not.toBeInTheDocument();
    });

    it('leaving between rounds pauses the next round and resume shows its full sequence', async () => {
      colors = randomQueue(['green', 'yellow']);
      render(<App />);
      await startGame();
      await advance(1000 + showTime(1));
      await press('green'); // round 1 complete

      await goAbout();
      goHome();
      expect(stage()).toBe('שלב 2 מתוך 10');

      vi.mocked(startTone).mockClear();
      await clickResume();
      await advance(1000 + showTime(2));
      expect(tones()).toEqual(['green', 'yellow']);
    });

    it('stays paused with a message when audio cannot resume, and a second try works', async () => {
      colors = ['green'];
      render(<App />);
      await startGame();
      await goAbout();
      goHome();

      vi.mocked(unlockAudio).mockResolvedValue(false);
      vi.mocked(startTone).mockClear();
      await clickResume();
      await advance(3000);
      expect(screen.getByText(/לא ניתן להפעיל צליל. לחצו שוב על „המשך משחק"/)).toBeInTheDocument();
      expect(startTone).not.toHaveBeenCalled();

      vi.mocked(unlockAudio).mockResolvedValue(true);
      await clickResume();
      await advance(1000 + showTime(1));
      expect(tones()).toEqual(['green']);
    });

    it('a double click on "המשך משחק" presents the sequence only once', async () => {
      await reachRound2Input(['green', 'blue']);
      await goAbout();
      goHome();

      vi.mocked(startTone).mockClear();
      const button = resumeButton()!;
      fireEvent.click(button);
      fireEvent.click(button);
      await advance(0);
      await advance(1000 + showTime(2) + 2000);
      expect(tones()).toEqual(['green', 'blue']);
    });
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

  describe('history', () => {
    const stored = (): GameResult[] => {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw).results : [];
    };
    const goAbout = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'אודות' }));
      await advance(0);
    };
    const goHome = () => fireEvent.click(screen.getByRole('button', { name: 'בית' }));
    const cards = () => screen.queryAllByRole('listitem').filter((li) => li.classList.contains('history-card'));
    const blockStorage = (method: 'getItem' | 'setItem' | 'removeItem') =>
      vi.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new Error('blocked');
      });

    function seed(count: number) {
      const results = Array.from({ length: count }, (_, i) =>
        createResult(i % 2 ? 'win' : 'loss', i, new Date(2026, 0, 1, 10, 59 - i)),
      );
      localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 1, results }));
      return results;
    }

    // Starts a game whose single color is green and presses red.
    async function loseRound1() {
      colors = ['green'];
      await startGame();
      await advance(1000 + showTime(1));
      await press('red');
      await advance(1000);
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('records a loss in round 1 exactly once and shows it in About', async () => {
      render(<App />);
      await loseRound1();
      expect(stored()).toHaveLength(1);
      expect(stored()[0]).toMatchObject({ completedRounds: 0, outcome: 'loss' });

      // Confirming and switching screens never add a record.
      fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
      await goAbout();
      goHome();
      await goAbout();
      expect(stored()).toHaveLength(1);
      expect(cards()).toHaveLength(1);
      expect(cards()[0]).toHaveTextContent('שלבים שהושלמו: 0');
      expect(cards()[0]).toHaveTextContent('תוצאה: הפסד');
      expect(cards()[0].querySelector('time')).toHaveAttribute('dateTime', stored()[0].finishedAt);
    });

    it('records a win with 10 completed rounds', async () => {
      const seq: ColorId[] = ['green', 'red', 'yellow', 'blue', 'green', 'red', 'yellow', 'blue', 'green', 'red'];
      colors = randomQueue(seq);
      render(<App />);
      await startGame();
      await advance(1000 + showTime(1));
      for (let round = 1; round <= 10; round++) {
        await playRound(seq.slice(0, round));
        if (round < 10) await advance(2000 + showTime(round + 1));
      }
      expect(stored()).toHaveLength(1);
      expect(stored()[0]).toMatchObject({ completedRounds: 10, outcome: 'win' });
      await goAbout();
      expect(cards()[0]).toHaveTextContent('תוצאה: ניצחון');
    });

    it('records the result right away, even when leaving before the message shows', async () => {
      render(<App />);
      colors = ['green'];
      await startGame();
      await advance(1000 + showTime(1));
      await press('red');
      await goAbout();
      expect(cards()).toHaveLength(1);
    });

    it('a paused or abandoned game adds no record', async () => {
      const { unmount } = render(<App />);
      colors = ['green'];
      await startGame();
      await advance(1300);
      await goAbout();
      goHome();
      expect(stored()).toHaveLength(0);
      unmount(); // like a refresh mid-game
      render(<App />);
      expect(stored()).toHaveLength(0);
    });

    it('records once under React Strict Mode', async () => {
      render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
      await loseRound1();
      expect(stored()).toHaveLength(1);
      await goAbout();
      expect(cards()).toHaveLength(1);
    });

    it('shows saved results newest first after a reload, and keeps only 10', async () => {
      const seeded = seed(10);
      const { unmount } = render(<App />);
      await goAbout();
      expect(cards()).toHaveLength(10);
      expect(cards()[0]).toHaveTextContent('שלבים שהושלמו: 0');
      expect(cards()[9]).toHaveTextContent('שלבים שהושלמו: 9');

      goHome();
      await loseRound1();
      unmount();
      render(<App />);
      await goAbout();
      expect(cards()).toHaveLength(10);
      expect(stored()).toHaveLength(10);
      expect(stored()[0].id).not.toBe(seeded[0].id);
      expect(stored().map((r) => r.id)).not.toContain(seeded[9].id);
    });

    it('shows an empty state and no delete button without results', async () => {
      render(<App />);
      await goAbout();
      expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
    });

    it('cancel keeps the history; delete clears it after confirmation', async () => {
      seed(3);
      render(<App />);
      await goAbout();

      fireEvent.click(screen.getByRole('button', { name: 'מחק היסטוריה' }));
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveTextContent('למחוק את ההיסטוריה?');
      expect(screen.getByRole('button', { name: 'ביטול' })).toHaveFocus();
      fireEvent.click(screen.getByRole('button', { name: 'ביטול' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(cards()).toHaveLength(3);
      expect(stored()).toHaveLength(3);

      fireEvent.click(screen.getByRole('button', { name: 'מחק היסטוריה' }));
      fireEvent.click(screen.getByRole('button', { name: 'מחק' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(cards()).toHaveLength(0);
      expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
      expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
    });

    it('a failed save shows a message but the game goes on', async () => {
      blockStorage('setItem');
      render(<App />);
      await loseRound1();
      expect(screen.getByRole('dialog')).toHaveTextContent('לא ניתן היה לשמור את התוצאה בהיסטוריה.');

      fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
      await loseRound1();
      expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!');
    });

    it('unreadable storage shows a message in About and does not block play', async () => {
      blockStorage('getItem');
      render(<App />);
      await goAbout();
      expect(screen.getByText(/לא ניתן לטעון את היסטוריית המשחקים/)).toBeInTheDocument();
      goHome();
      await loseRound1();
      expect(screen.getByRole('dialog')).toHaveTextContent('נפסלת!');
    });

    it('a failed delete shows a message and keeps the list', async () => {
      seed(2);
      blockStorage('removeItem');
      render(<App />);
      await goAbout();
      fireEvent.click(screen.getByRole('button', { name: 'מחק היסטוריה' }));
      fireEvent.click(screen.getByRole('button', { name: 'מחק' }));
      expect(screen.getByText('מחיקת ההיסטוריה נכשלה. נסו שוב.')).toBeInTheDocument();
      expect(cards()).toHaveLength(2);
    });
  });
});
