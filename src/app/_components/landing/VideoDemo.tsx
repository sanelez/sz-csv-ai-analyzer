export function VideoDemo() {
  return (
    <div className="mx-auto mb-20 max-w-4xl">
      <h3 className="mb-6 text-center text-2xl font-bold text-white">
        🎬 See it in action
      </h3>
      <div className="relative z-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-violet-500/10">
        <div className="aspect-video">
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/-uFtA4JkYQ4"
            title="CSV AI Analyzer Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
