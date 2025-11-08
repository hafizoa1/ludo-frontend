// src/App.jsx - Cleaner version without wrapper
import { useEffect } from 'react';
import PixiWrapper from './components/PixiWrapper';
import gameService from './services/GameService';

function App() {
  useEffect(() => {
    // Auto-connect to game service when app starts
    const connectToGame = async () => {
      console.log('🎮 App: Auto-connecting to game service...');
      await gameService.connect();
    };
    connectToGame();
    
    // Cleanup on unmount
    return () => {
      console.log('🎮 App: Cleaning up...');
      gameService.disconnect();
    };
  }, []);

  // No wrapper div needed - PixiWrapper handles full viewport
  return <PixiWrapper />;
}

export default App;