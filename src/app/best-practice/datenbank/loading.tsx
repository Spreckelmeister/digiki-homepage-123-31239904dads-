export default function Loading() {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-10 w-64 bg-white/20 rounded animate-pulse" />
          <div className="h-5 w-96 bg-white/10 rounded mt-3 animate-pulse" />
        </div>
      </section>
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-border">
                <div className="h-4 w-20 bg-bg rounded animate-pulse mb-3" />
                <div className="h-6 w-full bg-bg rounded animate-pulse mb-2" />
                <div className="h-4 w-3/4 bg-bg rounded animate-pulse mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-bg rounded-full animate-pulse" />
                  <div className="h-6 w-20 bg-bg rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
