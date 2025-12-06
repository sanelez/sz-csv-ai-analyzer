"use client";

import { useState } from "react";
import { Hero } from "./Hero";
import { VideoDemo } from "./VideoDemo";
import { FeaturesGrid } from "./FeaturesGrid";
import { HowItWorks } from "./HowItWorks";
import { generateDatasetById } from "~/lib/sample-data";
import type { CSVData, CSVSettings } from "~/lib/csv-parser";
import type { StoredSettings } from "~/lib/storage";

interface LandingPageProps {
  csvSettings: CSVSettings;
  apiSettings: StoredSettings | null;
  currentFileName: string | undefined;
  onSettingsChange: (settings: CSVSettings) => void;
  onApiSettingsChange: (settings: StoredSettings | null) => void;
  onFileLoaded: (content: string, fileName: string) => void;
  onClearFile: () => void;
  onDataLoaded: (data: CSVData, fileName: string) => void;
}

export function LandingPage({
  csvSettings,
  apiSettings,
  currentFileName,
  onSettingsChange,
  onApiSettingsChange,
  onFileLoaded,
  onClearFile,
  onDataLoaded,
}: LandingPageProps) {
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);

  const handleLoadSample = (datasetId: string) => {
    const dataset = generateDatasetById(datasetId);
    if (!dataset) return;

    // Convert to CSVData format
    const data: CSVData = {
      headers: dataset.headers,
      rows: dataset.rows,
      columns: dataset.headers.map((name, index) => ({
        name,
        type: "string" as const,
        index,
      })),
      rowCount: dataset.rows.length,
    };

    onDataLoaded(data, dataset.name);
    setShowSampleDropdown(false);
  };

  return (
    <div className="animate-fade-in">
      <Hero
        csvSettings={csvSettings}
        apiSettings={apiSettings}
        currentFileName={currentFileName}
        showSampleDropdown={showSampleDropdown}
        onSettingsChange={onSettingsChange}
        onApiSettingsChange={onApiSettingsChange}
        onFileLoaded={onFileLoaded}
        onClearFile={onClearFile}
        onLoadSample={handleLoadSample}
        onToggleSampleDropdown={() => setShowSampleDropdown(!showSampleDropdown)}
      />
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <VideoDemo />
        <FeaturesGrid />
        <HowItWorks />
        {/* Footer info */}
        <div className="max-w-2xl mx-auto mt-16 pb-16 text-center">
          <p className="text-gray-500 text-sm">
            Built with Next.js, TailwindCSS, Recharts, and OpenAI. 
          </p>
        </div>
      </div>
    </div>
  );
}
