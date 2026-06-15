'use client';

interface CameraErrorProps {
  error: string;
}

export function CameraError({ error }: CameraErrorProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#000818] text-white p-8">
      <div className="max-w-lg w-full text-center">
        {/* Camera Icon */}
        <div className="mb-8 flex justify-center">
          <svg
            className="w-24 h-24 text-red-500 opacity-80"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.828v6.344a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
            />
            <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={1.5} />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-red-500 mb-4">Camera Required</h1>

        <p className="text-xl text-gray-300 mb-6">
          Gesture Runner needs your camera to detect body movements.
        </p>

        <div className="bg-gray-900 rounded-xl p-6 mb-8 text-left border border-red-900">
          <p className="text-red-400 font-mono text-sm break-words">{error}</p>
        </div>

        <div className="space-y-4 text-gray-400 text-lg">
          <div className="flex items-start gap-3">
            <span className="text-[#00ffcc] font-bold text-xl flex-shrink-0">1.</span>
            <p>Click the camera icon in your browser's address bar</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[#00ffcc] font-bold text-xl flex-shrink-0">2.</span>
            <p>Select <strong>"Allow"</strong> to grant camera access</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[#00ffcc] font-bold text-xl flex-shrink-0">3.</span>
            <p>Refresh the page to try again</p>
          </div>
        </div>

        <div className="mt-10 text-gray-600 text-base">
          Make sure no other application is using the camera.
        </div>
      </div>
    </div>
  );
}
