import Link from 'next/link';
import { Logo } from '@/components/logo';

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-gunmetal bg-void-black/95 backdrop-blur nav-inset-highlight">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5">
        <Link href="/" aria-label="SafeRoute Home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-[14px] text-frost sm:flex">
          <Link href="/" className="transition-colors hover:text-pure-white">
            Signals Console
          </Link>
          <span className="text-muted-steel">Community Reports</span>
          <span className="text-muted-steel">Evidence-First</span>
        </nav>
        <a
          href="#report"
          className="btn-primary-action px-5 py-2 text-[14px] font-medium leading-none"
        >
          Submit report
        </a>
      </div>
    </header>
  );
}
