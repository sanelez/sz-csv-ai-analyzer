"use client";

import { Sparkles, Database, ChevronDown } from "lucide-react";
import { FileUpload } from "../FileUpload";
import { APIKeyButton } from "../APIKeySettings";
import { CSVSettingsButton } from "../CSVSettings";
import { SAMPLE_DATASETS } from "~/lib/sample-data";
import type { CSVSettings } from "~/lib/csv-parser";
import type { StoredSettings } from "~/lib/storage";

interface HeroProps {
  csvSettings: CSVSettings;
  apiSettings: StoredSettings | null;
  currentFileName: string | undefined;
  showSampleDropdown: boolean;
  onSettingsChange: (settings: CSVSettings) => void;
  onApiSettingsChange: (settings: StoredSettings | null) => void;
  onFileLoaded: (content: string, fileName: string) => void;
  onClearFile: () => void;
  onLoadSample: (datasetId: string) => void;
  onToggleSampleDropdown: () => void;
}

export function Hero({
  csvSettings,
  apiSettings,
  currentFileName,
  showSampleDropdown,
  onSettingsChange,
  onApiSettingsChange,
  onFileLoaded,
  onClearFile,
  onLoadSample,
  onToggleSampleDropdown,
}: HeroProps) {
  return (
    <div>
      <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-12 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                CSV AI Analyzer
              </h1>
              <p className="text-gray-400">
                Intelligent data analysis powered by AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CSVSettingsButton
              settings={csvSettings}
              onSettingsChange={onSettingsChange}
            />
            <APIKeyButton
              onSettingsChange={onApiSettingsChange}
              currentSettings={apiSettings}
            />
          </div>
        </div>

        {/* Hero Content */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-violet-200 to-fuchsia-200">
            Analyze your CSV files with AI in seconds
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Upload your data, let AI analyze it, and get intelligent chart suggestions. 
            <span className="text-violet-400 font-semibold"> 100% private</span> — your data never leaves your browser.
          </p>
        </div>

        {/* Upload Section */}
        <div id="upload-section" className="max-w-4xl mx-auto mb-12">
          <FileUpload
            onFileLoaded={onFileLoaded}
            currentFileName={currentFileName}
            onClear={onClearFile}
          />

          {/* Sample Data Loader */}
          <div className="flex items-center justify-center gap-3 mt-6 animate-fade-in">
            <span className="text-sm text-gray-500">Or try a sample:</span>
            <div className="relative">
              <button
                onClick={onToggleSampleDropdown}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm text-gray-300"
              >
                <Database className="w-4 h-4" />
                Load Sample Data
                <ChevronDown className={`w-4 h-4 transition-transform ${showSampleDropdown ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown */}
              {showSampleDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="py-1">
                    {SAMPLE_DATASETS.map((dataset) => (
                      <button
                        key={dataset.id}
                        onClick={() => onLoadSample(dataset.id)}
                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {dataset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
