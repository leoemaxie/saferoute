import { ReportForm } from '@/components/report-form';
import { SignalFeed } from '@/components/signal-feed';
import { TopNav } from '@/components/top-nav';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-void-black">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-5 pb-20">
        <section className="grid gap-10 py-14 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="font-display text-[40px] font-medium leading-[1.1] text-pure-white md:text-[53px] md:leading-[1.08]">
              What has been reported, and how much to trust it.
            </h1>
            <p className="mt-4 max-w-[520px] text-[16px] leading-[1.6] text-frost md:text-[20px] md:leading-[1.45]">
              SafeRoute turns community reports into transparent signals with visible evidence,
              corroboration, contradiction, and recency. It never declares a route safe.
            </p>
          </div>
          <ReportForm />
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[28px] font-medium text-pure-white">Live signals</h2>
            <span className="text-[12px] text-muted-steel">Refreshes automatically</span>
          </div>
          <SignalFeed />
        </section>
      </main>
    </div>
  );
}
