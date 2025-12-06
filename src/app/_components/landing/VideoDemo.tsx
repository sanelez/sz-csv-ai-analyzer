export function VideoDemo() {
  return (
    <div className="max-w-4xl mx-auto mb-20">
      <h3 className="text-2xl font-bold text-center mb-6 text-white">
        🎬 See it in action
      </h3>
      <div className="relative z-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-violet-500/10">
        <div className="aspect-video">
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/-uFtA4JkYQ4"
            title="CSV AI Analyzer Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
