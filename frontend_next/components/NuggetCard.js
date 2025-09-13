import { useState } from 'react';

export default function NuggetCard({ nugget, type, query }) {
  const [flipped, setFlipped] = useState(false);
  const [sparkle, setSparkle] = useState(false);

  const handleClaim = () => {
    // TODO: POST to backend /claims if persistent storage needed
    setSparkle(true);
    setTimeout(() => setSparkle(false), 1000);
    alert('Claim staked!');
  };

  return (
    <div
      className={`bg-rustic border-4 border-sepia rounded-lg p-4 sm:p-6 shadow-lg flex flex-col gap-2 transition-transform duration-500 ${flipped ? 'rotate-y-180' : ''} w-full sm:max-w-md mx-auto`}
      onClick={() => setFlipped(!flipped)}
      style={{ perspective: '1000px', cursor: 'pointer' }}
    >
      <div className="relative">
        {sparkle && (
          <span className="absolute top-0 right-0 text-2xl animate-ping">✨</span>
        )}
        {/* Achievement unlock animation */}
        {sparkle && (
          <span className="absolute left-0 bottom-0 text-lg animate-bounce text-gold">🏆 Achievement Unlocked!</span>
        )}
        <h3 className="text-xl sm:text-2xl font-bold mb-2">{nugget.title}</h3>
        <p className="mb-2 text-sm sm:text-base">{nugget.description}</p>
        <a href={nugget.link} target="_blank" rel="noopener noreferrer" className="text-gold underline mb-2">View Source ({nugget.source})</a>
        <button
          className="bg-gold text-sepia px-2 sm:px-4 py-2 rounded shadow hover:bg-sepia hover:text-gold"
          onClick={e => { e.stopPropagation(); handleClaim(); }}
        >
          Stake a Claim
        </button>
      </div>
      {flipped && (
        <div className="mt-4 text-xs sm:text-sm bg-sepia text-gold p-2 rounded">
          {/* TODO: Show more info, AI summary, related nuggets */}
          More info coming soon!
        </div>
      )}
    </div>
  );
}
