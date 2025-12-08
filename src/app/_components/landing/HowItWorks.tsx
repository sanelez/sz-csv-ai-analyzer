export function HowItWorks() {
  return (
    <div className="mx-auto mb-20 max-w-4xl">
      <h3 className="mb-10 text-center text-2xl font-bold text-white">
        🚀 How it works
      </h3>
      <div className="grid gap-6 md:grid-cols-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl font-bold">
            1
          </div>
          <h4 className="mb-2 font-semibold text-white">Upload CSV</h4>
          <p className="text-sm text-gray-400">
            Drag & drop or select your CSV file
          </p>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl font-bold">
            2
          </div>
          <h4 className="mb-2 font-semibold text-white">Add API Key</h4>
          <p className="text-sm text-gray-400">
            Configure an API key or a custom endpoint (OpenAI, Anthropic,
            Google, or self-hosted)
          </p>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl font-bold">
            3
          </div>
          <h4 className="mb-2 font-semibold text-white">Run Analysis</h4>
          <p className="text-sm text-gray-400">
            Click the button and let AI do the work
          </p>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl font-bold">
            4
          </div>
          <h4 className="mb-2 font-semibold text-white">Get Insights</h4>
          <p className="text-sm text-gray-400">
            View summaries, anomalies, and charts
          </p>
        </div>
      </div>
    </div>
  );
}
