import React, { useEffect, useState } from 'react';
import ClaimPin from '../components/ClaimPin';

function MapView() {
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('claims');
    if (saved) {
      setClaims(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="min-h-screen bg-sepia text-gold font-rustic flex flex-col items-center p-8">
      <h2 className="text-3xl mb-6">Your Treasure Map</h2>
      <div className="relative w-full max-w-3xl h-[500px] bg-rustic rounded-lg shadow-lg overflow-hidden">
        {/* TODO: Replace with actual treasure map image */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80')] bg-cover opacity-40"></div>
        {claims.length === 0 ? (
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl">No claims staked yet.</p>
        ) : (
          claims.map((claim, idx) => (
            <ClaimPin key={idx} claim={claim} idx={idx} />
          ))
        )}
      </div>
    </div>
  );
}

export default MapView;
