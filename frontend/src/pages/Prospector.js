import React, { useState } from 'react';

function getSourceColor(source) {
  switch (source) {
    case 'Reddit': return '#ff4500';
    case 'GitHub': return '#24292e';
    case 'Etsy': return '#f56400';
    default: return '#888';
  }
}

function getSourceIcon(source) {
  switch (source) {
    case 'Reddit': return '🤖';
    case 'GitHub': return '🐙';
    case 'Etsy': return '🛒';
    default: return '🔎';
  }
}

export default function Prospector() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const url = `http://localhost:8001/search/gamers?query=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError('Error fetching nuggets.');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #f7e9d3, #fffbe6)', padding: '2em' }}>
      <h1 style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '0.5em', color: '#b8860b' }}>🤠 The Prospector</h1>
      <form onSubmit={handleSearch} style={{ marginBottom: '2em', display: 'flex', gap: '1em' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="What are you prospecting for?"
          style={{ flex: 1, padding: '0.75em', fontSize: '1.1em', borderRadius: '8px', border: '1px solid #b8860b' }}
        />
        <button type="submit" style={{ background: '#b8860b', color: '#fff', padding: '0.75em 2em', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1em', border: 'none', boxShadow: '0 2px 8px #e2c275' }}>
          Prospect
        </button>
      </form>
      {loading && <p style={{ color: '#b8860b', fontWeight: 'bold' }}>⛏ Digging for gold...</p>}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2em' }}>
        {results.map((nugget, idx) => (
          <div key={idx} style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 16px #e2c275', padding: '2em', display: 'flex', flexDirection: 'column', gap: '1em', borderLeft: `8px solid ${getSourceColor(nugget.source)}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
              <span style={{ fontSize: '2em' }}>{getSourceIcon(nugget.source)}</span>
              <span style={{ fontWeight: 'bold', color: getSourceColor(nugget.source) }}>{nugget.source}</span>
            </div>
            <h2 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: 0 }}>{nugget.title}</h2>
            <p style={{ margin: 0, color: '#444' }}>{nugget.description}</p>
            <a href={nugget.link} target="_blank" rel="noopener noreferrer" style={{ color: getSourceColor(nugget.source), textDecoration: 'underline', fontWeight: 'bold' }}>
              View Source
            </a>
          </div>
        ))}
      </div>
      {results.length === 0 && !loading && !error && (
        <p style={{ color: '#888', marginTop: '2em', fontSize: '1.2em' }}>No nuggets found in this claim.</p>
      )}
    </div>
  );
}
