export default function Loading() {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-10 w-48 bg-white/20 rounded animate-pulse" />
          <div className="h-5 w-64 bg-white/10 rounded mt-3 animate-pulse" />
        </div>
      </section>
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 mb-8">
            <div className="h-5 w-24 bg-bg rounded animate-pulse" />
            <div className="h-5 w-20 bg-bg rounded animate-pulse" />
            <div className="h-5 w-20 bg-bg rounded animate-pulse" />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-4 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-5 flex-1 bg-bg rounded animate-pulse" />
                  <div className="h-5 w-24 bg-bg rounded animate-pulse" />
                  <div className="h-5 w-16 bg-bg rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
