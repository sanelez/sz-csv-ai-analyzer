import { Upload, Sparkles, BarChart3, Shield, Zap, Server } from "lucide-react";

export function FeaturesGrid() {
  return (
    <div className="max-w-6xl mx-auto mb-20">
      <h3 className="text-2xl font-bold text-center mb-10 text-white">
        ✨ Key Features
      </h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Feature 1 */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">Smart CSV Parsing</h4>
          <p className="text-gray-400 text-sm">
            Drag & drop upload with automatic delimiter detection (comma, semicolon, tab). Configure encoding and headers as needed.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">AI-Powered Analysis</h4>
          <p className="text-gray-400 text-sm">
            Get intelligent summaries, detect anomalies, and receive tailored insights about your data using OpenAI GPT models.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">Smart Chart Suggestions</h4>
          <p className="text-gray-400 text-sm">
            AI analyzes your data structure and suggests the most relevant charts: Bar, Line, Pie, Scatter, and Area charts.
          </p>
        </div>

        {/* Feature 4 */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">100% Private</h4>
          <p className="text-gray-400 text-sm">
            Your data never touches our servers. Processing happens in your browser, API calls go directly to OpenAI. No tracking.
          </p>
        </div>

        {/* Feature 5 */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">One-Click Analysis</h4>
          <p className="text-gray-400 text-sm">
            Run complete analysis with a single click. Get data summary, anomaly detection, and chart suggestions all at once.
          </p>
        </div>

        {/* Feature 6 */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Server className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">Self-Hostable</h4>
          <p className="text-gray-400 text-sm">
            Deploy with Docker in seconds. Use your own LLM server (Ollama, LM Studio, vLLM) or any OpenAI-compatible API.
          </p>
        </div>
      </div>
    </div>
  );
}
