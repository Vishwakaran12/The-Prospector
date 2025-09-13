import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-6xl">🤠</span>
            <h1 className="text-5xl font-bold text-amber-900">The Prospector</h1>
            <span className="text-6xl">⛏️</span>
          </div>
          <p className="text-xl text-amber-700 max-w-2xl mx-auto">
            Strike digital gold across the vast frontier of the internet. Search for treasures in gaming, 
            open source, collectibles, and opportunities.
          </p>
          <Badge variant="outline" className="mt-4 text-amber-800 border-amber-600">
            🌟 Powered by Reddit & GitHub APIs
          </Badge>
        </div>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="border-amber-200 hover:shadow-lg transition-all duration-300 hover:border-amber-300">
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">🔍</div>
              <CardTitle className="text-amber-900">Smart Prospector</CardTitle>
              <CardDescription>
                AI-powered search across multiple sources for the best nuggets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/prospector">
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                  Start Prospecting
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-orange-200 hover:shadow-lg transition-all duration-300 hover:border-orange-300">
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">🎮</div>
              <CardTitle className="text-orange-900">Gaming Frontier</CardTitle>
              <CardDescription>
                Discover gaming treasures, communities, and opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/search/gamers">
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                  Explore Gaming
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-red-200 hover:shadow-lg transition-all duration-300 hover:border-red-300">
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">🛠️</div>
              <CardTitle className="text-red-900">Developer Tools</CardTitle>
              <CardDescription>
                Debug and test the prospecting API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/debug">
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                  Debug Console
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="bg-white/50 backdrop-blur-sm rounded-lg p-8 border border-amber-200">
          <h2 className="text-2xl font-bold text-amber-900 mb-6 text-center">🏆 Prospecting Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">🤖</div>
              <h3 className="font-semibold text-amber-800">Reddit Integration</h3>
              <p className="text-sm text-amber-600">Live community discussions and trends</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🐙</div>
              <h3 className="font-semibold text-amber-800">GitHub Repositories</h3>
              <p className="text-sm text-amber-600">Open source projects and code treasures</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🛒</div>
              <h3 className="font-semibold text-amber-800">Marketplace Finds</h3>
              <p className="text-sm text-amber-600">Unique items and collectibles</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-semibold text-amber-800">Real-time Search</h3>
              <p className="text-sm text-amber-600">Instant results from multiple APIs</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-amber-700">
          <p className="text-lg font-western">
            ⛏️ Happy prospecting, partner! May your searches strike gold! ⛏️
          </p>
        </div>
      </div>
    </div>
  );
}
