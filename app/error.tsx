'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-void-black px-5">
      <div className="max-w-md text-center">
        <h1 className="font-display text-[36px] font-medium text-pure-white">
          Something went wrong
        </h1>
        <p className="mt-2 text-[16px] text-frost">
          An error occurred while loading this page. You can try again or return to the signals console.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary-action px-5 py-2 text-[14px] font-medium"
          >
            Try again
          </button>
          <Link
            href="/"
            className="text-[14px] text-periwinkle-glow transition-colors hover:text-pure-white"
          >
            Back to dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
