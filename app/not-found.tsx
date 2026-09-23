import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-void-black px-5">
      <div className="text-center">
        <h1 className="font-display text-[36px] font-medium text-pure-white">Location not found</h1>
        <p className="mt-2 text-[16px] text-frost">
          No verified incident has been reported for this location.
        </p>
        <Link href="/" className="mt-4 inline-block text-periwinkle-glow">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
