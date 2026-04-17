export default function Loading() {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-10 w-48 bg-white/20 rounded animate-pulse" />
          <div className="h-5 w-80 bg-white/10 rounded mt-3 animate-pulse" />
        </div>
      </section>
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="hidden lg:block h-[400px] bg-bg rounded-2xl animate-pulse" />
            <div className="max-w-md mx-auto w-full">
              <div className="bg-white rounded-xl p-8 shadow-sm border border-border space-y-5">
                <div className="h-5 w-32 bg-bg rounded animate-pulse" />
                <div className="h-12 bg-bg rounded-lg animate-pulse" />
                <div className="h-5 w-24 bg-bg rounded animate-pulse" />
                <div className="h-12 bg-bg rounded-lg animate-pulse" />
                <div className="h-12 bg-accent/30 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
