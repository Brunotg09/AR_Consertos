'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ar-dark p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-ar-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.242 2.829a4.978 4.978 0 01-1.414-2.83m-4.242 8.767a9 9 0 01-1.619-5.248M3.05 12a9 9 0 0116.184 0"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Você está offline
        </h1>
        <p className="text-gray-400 mb-6">
          Verifique sua conexão com a internet e tente novamente.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-ar-gold hover:bg-ar-gold/90 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
