export default function ClaimPin({ claim, idx }) {
  // TODO: Use random positions for pins, or map coordinates if available
  const top = 50 + Math.sin(idx) * 100;
  const left = 50 + Math.cos(idx) * 300;
  return (
    <div
      className="absolute animate-bounce"
      style={{ top: `${top}px`, left: `${left}px` }}
    >
      <span className="text-3xl">📍</span>
      <div className="bg-gold text-sepia rounded px-2 py-1 text-xs shadow-lg">
        {claim.result?.title || 'Claim'}
      </div>
    </div>
  );
}
