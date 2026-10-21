import { useState } from 'react';
import NavBar, { type Screen } from './components/NavBar';
import HomeScreen from './screens/HomeScreen';
import AboutScreen from './screens/AboutScreen';

// Both screens live in one React tree; switching never reloads the page.
export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <div className="app">
      <main className="app-main">
        {screen === 'home' ? <HomeScreen /> : <AboutScreen />}
      </main>
      <NavBar current={screen} onNavigate={setScreen} />
    </div>
  );
}
