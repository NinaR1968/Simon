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
    // Leaving for About pauses an active game; it resumes only via "המשך משחק".
    if (next === 'about') game.pause();
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
