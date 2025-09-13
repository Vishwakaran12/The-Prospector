import { useEffect, useState } from 'react';
import ClaimPin from './ClaimPin';

export default function MapView() {
  const [claims, setClaims] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // TODO: Fetch claims from backend or localStorage
    setClaims([]); // Replace with real fetch
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center p-4 sm:p-8 ${darkMode ? 'bg-black text-gold' : 'bg-sepia text-gold'} font-rustic`}>
      <div className="flex flex-col sm:flex-row justify-between w-full max-w-3xl mb-4 gap-2">
        <h2 className="text-2xl sm:text-3xl">Your Treasure Map</h2>
        <button
          className="bg-gold text-sepia px-4 py-2 rounded shadow hover:bg-sepia hover:text-gold"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
      <div className="relative w-full max-w-3xl h-[300px] sm:h-[500px] bg-rustic rounded-lg shadow-lg overflow-hidden touch-pan-x touch-pan-y">
        {/* TODO: Add pan/zoom controls for map */}
        <div className={`absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80')] bg-cover ${darkMode ? 'opacity-20' : 'opacity-40'}`}></div>
        {claims.length === 0 ? (
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg sm:text-xl">No claims staked yet.</p>
        ) : (
          claims.map((claim, idx) => (
            <ClaimPin key={idx} claim={claim} idx={idx} />
          ))
        )}
      </div>
    </div>
  );
}
