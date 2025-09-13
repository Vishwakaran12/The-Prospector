import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sepia text-gold font-rustic">
      <h1 className="text-5xl mb-8">The Prospector</h1>
      <p className="mb-6 text-xl">Choose your prospecting path:</p>
      <div className="flex gap-8">
        <button
          className="bg-gold text-sepia px-6 py-3 rounded shadow-lg hover:bg-rustic"
          onClick={() => navigate('/search/gamers')}
        >
          Gamers’ Prospector
        </button>
        <button
          className="bg-gold text-sepia px-6 py-3 rounded shadow-lg hover:bg-rustic"
          onClick={() => navigate('/search/hobbyists')}
        >
          Hobbyists’ Prospector
        </button>
      </div>
    </div>
  );
}

export default Home;
