import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import NuggetCard from '../components/NuggetCard';

function Search() {
  const { type } = useParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const url = `http://localhost:8001/search/${type}?query=${encodeURIComponent(query)}`;
      console.log('Fetch URL:', url); // Debug log
      const res = await fetch(url);
      const data = await res.json();
      console.log('Backend response:', data); // Debug log
      if (Array.isArray(data) && data.length === 0) {
        setError('No nuggets found in this claim.');
      } else if (Array.isArray(data)) {
        setResults(data);
      } else {
        setError('Unexpected response from backend.');
      }
    } catch (err) {
      setError('No nuggets found in this claim.');
      console.error('Fetch error:', err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-sepia text-gold font-rustic p-8">
      <h2 className="text-3xl mb-4">{type === 'gamers' ? "Gamers’ Prospector" : "Hobbyists’ Prospector"}</h2>
      <form onSubmit={handleSearch} className="mb-6 flex gap-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="What are you prospecting for?"
          className="px-4 py-2 rounded text-sepia"
        />
        <button type="submit" className="bg-gold text-sepia px-4 py-2 rounded shadow-lg hover:bg-rustic">
          Search
        </button>
      </form>
      {loading && <p className="mb-4">⛏ Digging for gold...</p>}
      {error && <p className="mb-4 text-red-500">{error}</p>}
      <div className="grid gap-6">
        {/* Debug: Show raw backend response */}
        <pre style={{color: 'black', background: 'white', padding: '1em', borderRadius: '8px'}}>{JSON.stringify(results, null, 2)}</pre>
        {results.map((nugget, idx) => (
          <NuggetCard key={idx} nugget={nugget} type={type} query={query} />
        ))}
      </div>
    </div>
  );
}

export default Search;
