import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import MapView from './pages/MapView';
import DebugNuggets from './pages/DebugNuggets';
import Prospector from './pages/Prospector';
import './styles.css';

function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-gradient-to-b from-desert-sand to-amber-100">
        <nav className="bg-western-brown text-gold p-4 shadow-lg border-b-4 border-copper">
          <div className="container mx-auto flex items-center justify-between">
            <h1 className="text-3xl font-western font-bold">🤠 The Prospector</h1>
            <div className="text-sm font-saloon">
              "Strike gold in the digital frontier!"
            </div>
          </div>
        </nav>
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search/:type" element={<Search />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/debug" element={<DebugNuggets />} />
            <Route path="/prospector" element={<Prospector />} />
          </Routes>
        </main>
        
        <footer className="bg-sepia text-desert-sand p-4 mt-12 border-t-4 border-copper">
          <div className="container mx-auto text-center">
            <p className="font-western">⛏️ Happy prospecting, partner! ⛏️</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
