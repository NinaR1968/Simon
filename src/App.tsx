import { useEffect, useRef, useState } from 'react';
import NavBar, { type Screen } from './components/NavBar';
import HomeScreen from './screens/HomeScreen';
import AboutScreen from './screens/AboutScreen';
import { useGame } from './game/useGame';
import { useHistory } from './history/useHistory';

// Both screens live in one React tree; switching never reloads the page.
export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const game = useGame();
  const history = useHistory();
  const recordedGameId = useRef(0);

  // Records a finished game once, on entering won/lost (ADR-4); the gameId guard covers Strict Mode.
  const { status, gameId, completedRounds } = game.state;
  const { record } = history;
  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return;
    if (recordedGameId.current === gameId) return;
    recordedGameId.current = gameId;
    record(status === 'won' ? 'win' : 'loss', completedRounds);
  }, [status, gameId, completedRounds, record]);

  const navigate = (next: Screen) => {
    // Leaving for About pauses an active game; it resumes only via "המשך משחק".
    if (next === 'about') game.pause();
    setScreen(next);
  };

  return (
    <div className="app">
      <main className="app-main">
        {screen === 'home' ? (
          <HomeScreen game={game} saveError={history.saveError} />
        ) : (
          <AboutScreen history={history} />
        )}
      </main>
      <NavBar current={screen} onNavigate={navigate} />
    </div>
  );
}
