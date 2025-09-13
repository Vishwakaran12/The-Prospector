import React from 'react';

function NuggetCard({ nugget, type, query }) {
  const handleClaim = () => {
    const claims = JSON.parse(localStorage.getItem('claims') || '[]');
    claims.push({ query, type, result: nugget });
    localStorage.setItem('claims', JSON.stringify(claims));
    alert('Claim staked!');
    // TODO: POST to backend /claims if persistent storage needed
  };

  return (
    <div className="bg-rustic border-4 border-sepia rounded-lg p-6 shadow-lg flex flex-col gap-2">
      <h3 className="text-2xl font-bold mb-2">{nugget.title}</h3>
      <p className="mb-2">{nugget.description}</p>
      <a href={nugget.link} target="_blank" rel="noopener noreferrer" className="text-gold underline mb-2">View Source ({nugget.source})</a>
      <button
        className="bg-gold text-sepia px-4 py-2 rounded shadow hover:bg-sepia hover:text-gold"
        onClick={handleClaim}
      >
        Stake a Claim
      </button>
    </div>
  );
}

export default NuggetCard;
