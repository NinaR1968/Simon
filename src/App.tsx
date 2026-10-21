import { useState } from 'react';
import NavBar, { type Screen } from './components/NavBar';
import HomeScreen from './screens/HomeScreen';
import AboutScreen from './screens/AboutScreen';
import { useGame } from './game/useGame';

// Both screens live in one React tree; switching never reloads the page.
export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const game = useGame();

  const navigate = (next: Screen) => {
    // Temporary Milestone 2 behavior: leaving mid-game cancels it (replaced by pause in M3).
    if (next === 'about' && game.isActive) game.cancel();
    setScreen(next);
  };

  return (
    <div className="app">
      <main className="app-main">
        {screen === 'home' ? <HomeScreen game={game} /> : <AboutScreen />}
      </main>
      <NavBar current={screen} onNavigate={navigate} />
    </div>
  );
}
