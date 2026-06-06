export default function ChatLoading() {
  return (
    <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:-m-8 md:flex-row">
      {/* Sidebar skeleton */}
      <div className="w-80 border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <div className="h-8 w-full bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="p-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
      
      {/* Main chat area skeleton */}
      <div className="flex-1 flex flex-col bg-slate-50">
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
            <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="mx-auto w-[80%] space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-2xl p-4 shadow-sm ${
                  i % 2 === 0 
                    ? 'bg-blue-100 max-w-md' 
                    : 'bg-white border border-slate-200 w-full'
                }`}>
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}