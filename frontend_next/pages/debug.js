import { useState } from 'react';

export default function DebugApi() {
  const [query, setQuery] = useState('vue');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFetch() {
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const url = `http://localhost:8001/search/gamers?query=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError('Error fetching from backend');
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: '2em', background: '#fff', color: '#222' }}>
      <h2>Debug Prospector API (Next.js)</h2>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search query"
        style={{ marginRight: '1em', padding: '0.5em' }}
      />
      <button onClick={handleFetch} style={{ padding: '0.5em 1em' }}>Fetch Nuggets</button>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <pre style={{ marginTop: '2em', background: '#eee', padding: '1em', borderRadius: '8px' }}>
        {JSON.stringify(results, null, 2)}
      </pre>
      <ul>
        {results.map((nugget, idx) => (
          <li key={idx} style={{ marginBottom: '1em' }}>
            <strong>{nugget.title}</strong><br />
            <span>{nugget.description}</span><br />
            <a href={nugget.link} target="_blank" rel="noopener noreferrer">View Source ({nugget.source})</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
