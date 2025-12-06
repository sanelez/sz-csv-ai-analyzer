export function HowItWorks() {
  return (
    <div className="max-w-4xl mx-auto mb-20">
      <h3 className="text-2xl font-bold text-center mb-10 text-white">
        🚀 How it works
      </h3>
      <div className="grid md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
          <h4 className="font-semibold text-white mb-2">Upload CSV</h4>
          <p className="text-gray-400 text-sm">Drag & drop or select your CSV file</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
          <h4 className="font-semibold text-white mb-2">Add API Key</h4>
          <p className="text-gray-400 text-sm">Configure your OpenAI API key (stored locally)</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
          <h4 className="font-semibold text-white mb-2">Run Analysis</h4>
          <p className="text-gray-400 text-sm">Click the button and let AI do the work</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
          <h4 className="font-semibold text-white mb-2">Get Insights</h4>
          <p className="text-gray-400 text-sm">View summaries, anomalies, and charts</p>
        </div>
      </div>
    </div>
  );
}
