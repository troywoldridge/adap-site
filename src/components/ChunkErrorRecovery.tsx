// src/components/ChunkErrorRecovery.tsx
"use client";

import React, { ReactNode, useEffect, useState } from "react";

interface ChunkErrorRecoveryProps {
  /** What to render inside the boundary */
  children: ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

class ErrorBoundaryWrapper extends React.Component<
  { children: ReactNode },
  BoundaryState
> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("ChunkErrorRecovery caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      // Let the parent client component handle the UI
      return null;
    }
    return this.props.children;
  }
}

export default function ChunkErrorRecovery({
  children,
}: ChunkErrorRecoveryProps) {
  const [chunkError, setChunkError] = useState(false);

  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const isChunkLoad =
        (e.error && (e.error as any).name === "ChunkLoadError") ||
        /Loading chunk .* failed/.test(e.message || "");

      if (!isChunkLoad) {
        return;
      }

      console.warn("Detected chunk load failure, prompting user to retry.");
      setChunkError(true);
    };

    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);

  const handleRetry = () => {
    // Clear any flags to allow fresh load
    sessionStorage.removeItem("chunk-reload-attempted");
    setChunkError(false);
    window.location.reload();
  };

  // If a chunk error was detected, show fallback screen
  if (chunkError) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white p-4 z-50">
        <div className="bg-red-100 border border-red-300 text-red-800 px-6 py-4 rounded-lg shadow-lg text-center max-w-sm">
          <h2 className="text-xl font-semibold mb-2">Oops!</h2>
          <p className="mb-4">
            Something went wrong loading this part of the app.{" "}
            <br />
            Would you like to try again?
          </p>
          <button
            onClick={handleRetry}
            className="mt-2 inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Otherwise wrap children in the error boundary
  return <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>;
}
