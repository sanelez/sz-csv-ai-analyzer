import { Upload, Sparkles, BarChart3, Shield, Zap, Server } from "lucide-react";

export function FeaturesGrid() {
  return (
    <div className="mx-auto mb-20 max-w-6xl">
      <h3 className="mb-10 text-center text-2xl font-bold text-white">
        ✨ Key Features
      </h3>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Feature 1 */}
        <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 transition-transform group-hover:scale-110">
            <Upload className="h-6 w-6 text-white" />
          </div>
          <h4 className="mb-2 text-lg font-semibold text-white">
            Smart File Parsing
          </h4>
          <p className="text-sm text-gray-400">
            Drag & drop CSV or Excel (.xlsx) files with automatic delimiter
            detection. Configure encoding and headers as needed.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-500 transition-transform group-hover:scale-110">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h4 className="mb-2 text-lg font-semibold text-white">
            AI-Powered Analysis
          </h4>
          <p className="text-sm text-gray-400">
            Get intelligent summaries, detect anomalies, and receive tailored
            insights about your data using multiple AI providers: OpenAI,
            Anthropic Claude, Google Gemini, Mistral, and more.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-fuchsia-500 to-pink-500 transition-transform group-hover:scale-110">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <h4 className="mb-2 text-lg font-semibold text-white">
            Smart Chart Suggestions
          </h4>
          <p className="text-sm text-gray-400">
            AI analyzes your data structure and suggests the most relevant
            charts: Bar, Line, Pie, Scatter, and Area charts.
          </p>
        </div>

        {/* Feature 4 */}
        <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-green-500 to-emerald-500 transition-transform group-hover:scale-110">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h4 className="mb-2 text-lg font-semibold text-white">
            Privacy-first
          </h4>
          <p className="text-sm text-gray-400">
            The app does not store your data. API calls go directly to the
            selected AI provider, configure a self-hosted/custom endpoint to
            keep processing entirely local to your environment.
          </p>
        </div>

        {/* Feature 5 */}
        <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-500 transition-transform group-hover:scale-110">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h4 className="mb-2 text-lg font-semibold text-white">
            One-Click Analysis
          </h4>
          <p className="text-sm text-gray-400">
            Run complete analysis with a single click. Get data summary, anomaly
            detection, and chart suggestions all at once.
          </p>
        </div>

        {/* Feature 6 */}
        <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-blue-500 transition-transform group-hover:scale-110">
            <Server className="h-6 w-6 text-white" />
          </div>
          <h4 className="mb-2 text-lg font-semibold text-white">
            Self-Hostable
          </h4>
          <p className="text-sm text-gray-400">
            Deploy with Docker in seconds. Use your own LLM server (Ollama, LM
            Studio, vLLM) or any OpenAI-compatible API.
          </p>
        </div>
      </div>
    </div>
  );
}
