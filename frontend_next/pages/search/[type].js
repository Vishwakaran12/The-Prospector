import { useState } from 'react';
import NuggetCard from '../../components/NuggetCard';
import { useRouter } from 'next/router';

export default function SearchPage() {
  const router = useRouter();
  const { type } = router.query;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('relevance');
  const [filter, setFilter] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const res = await fetch(`/api/search/${type}?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.length === 0) {
        setError('No nuggets found in this claim.');
      } else {
        setResults(data);
      }
    } catch (err) {
      setError('No nuggets found in this claim.');
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
        <select value={sort} onChange={e => setSort(e.target.value)} className="px-2 py-2 rounded text-sepia">
          <option value="relevance">Sort: Relevance</option>
          <option value="rarity">Sort: Rarity</option>
          <option value="date">Sort: Date</option>
        </select>
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by tag"
          className="px-2 py-2 rounded text-sepia"
        />
        <button type="submit" className="bg-gold text-sepia px-4 py-2 rounded shadow-lg hover:bg-rustic">
          Prospect
        </button>
      </form>
      {/* TODO: Apply sort/filter to results */}
      {loading && <p className="mb-4">⛏ Digging for gold...</p>}
      {error && <p className="mb-4 text-red-500">{error}</p>}
      <div className="grid gap-6">
        {results.map((nugget, idx) => (
          <NuggetCard key={idx} nugget={nugget} type={type} query={query} />
        ))}
      </div>
    </div>
  );
}
