import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sepia text-gold font-rustic">
      <Head>
        <title>The Prospector</title>
      </Head>
      <h1 className="text-5xl mb-8 animate-pulse">The Prospector</h1>
      <p className="mb-6 text-xl">Choose your prospecting path:</p>
      <div className="flex gap-8 mb-8">
        <Link href="/search/gamers">
          <button className="bg-gold text-sepia px-6 py-3 rounded shadow-lg hover:bg-rustic">
            Gamers’ Prospector
          </button>
        </Link>
        <Link href="/search/hobbyists">
          <button className="bg-gold text-sepia px-6 py-3 rounded shadow-lg hover:bg-rustic">
            Hobbyists’ Prospector
          </button>
        </Link>
      </div>
      {/* Gamification stats */}
      <div className="mb-4 text-lg">Gold found: <span className="font-bold">0</span> | Claims staked: <span className="font-bold">0</span></div>
      <Link href="/map">
        <button className="bg-sepia text-gold px-4 py-2 rounded shadow hover:bg-gold hover:text-sepia">View Treasure Map</button>
      </Link>
    </div>
  );
}
