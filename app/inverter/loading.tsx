export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="mx-auto h-8 w-32 animate-pulse rounded" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
      </div>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl" style={{ backgroundColor: "rgba(139,92,246,0.03)" }} />
        ))}
      </div>
    </div>
  );
}
