import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NuggetResult {
  title: string;
  description: string;
  link: string;
  source: string;
}

function getSourceColor(source: string) {
  switch (source) {
    case 'Reddit': return 'bg-orange-500';
    case 'GitHub': return 'bg-gray-800';
    case 'Etsy': return 'bg-orange-600';
    default: return 'bg-gray-500';
  }
}

function getSourceIcon(source: string) {
  switch (source) {
    case 'Reddit': return '🤖';
    case 'GitHub': return '🐙';
    case 'Etsy': return '🛒';
    default: return '🔎';
  }
}

export default function Prospector() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NuggetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const url = `http://localhost:3002/search/gamers?query=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch nuggets. Make sure the backend is running on port 8001.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-4xl">🤠</span>
            <h1 className="text-4xl font-bold text-amber-900">Smart Prospector</h1>
            <span className="text-4xl">⛏️</span>
          </div>
          <p className="text-lg text-amber-700">
            Search across Reddit, GitHub, and more to strike digital gold!
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Search className="h-5 w-5" />
              What are you prospecting for?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-4">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your search query (e.g., javascript, gaming, AI, python...)"
                className="flex-1 border-amber-300 focus:border-amber-500"
              />
              <Button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white px-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Digging...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Prospect
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-600" />
            <p className="text-amber-700 font-medium">⛏️ Digging for gold nuggets...</p>
          </div>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-amber-900">
                🏆 Found {results.length} Nuggets
              </h2>
              <Badge variant="outline" className="text-amber-800 border-amber-600">
                Search: "{query}"
              </Badge>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {results.map((nugget, idx) => (
                <Card key={idx} className="border-l-4 hover:shadow-lg transition-all duration-300 group" 
                      style={{ borderLeftColor: getSourceColor(nugget.source).replace('bg-', '#') }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge 
                        variant="secondary" 
                        className={`${getSourceColor(nugget.source)} text-white`}
                      >
                        <span className="mr-1">{getSourceIcon(nugget.source)}</span>
                        {nugget.source}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight group-hover:text-amber-700 transition-colors">
                      {nugget.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm mb-4 line-clamp-3">
                      {nugget.description || nugget.title}
                    </CardDescription>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => window.open(nugget.link, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Source
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && results.length === 0 && query && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🕳️</div>
            <h3 className="text-xl font-semibold text-amber-800 mb-2">No nuggets found</h3>
            <p className="text-amber-600">Try a different search term or check your spelling</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && results.length === 0 && !query && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏜️</div>
            <h3 className="text-xl font-semibold text-amber-800 mb-2">Ready to prospect?</h3>
            <p className="text-amber-600">Enter a search term above to start finding digital treasures</p>
          </div>
        )}
      </div>
    </div>
  );
}
