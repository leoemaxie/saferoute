import Link from 'next/link';

export function TopNav() {
  return (
    <header className="border-b border-gunmetal bg-void-black">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-3 rounded-full bg-periwinkle-glow" />
          <span className="font-display text-[16px] font-medium text-pure-white">SafeRoute</span>
        </Link>
        <nav className="hidden items-center gap-6 text-[14px] text-frost sm:flex">
          <Link href="/" className="hover:text-pure-white">
            Dashboard
          </Link>
          <span className="text-muted-steel">Community signals</span>
          <span className="text-muted-steel">Evidence-first</span>
        </nav>
        <a href="#report" className="btn-primary-action px-5 py-2 text-[14px] font-medium">
          Submit report
        </a>
      </div>
    </header>
  );
}
