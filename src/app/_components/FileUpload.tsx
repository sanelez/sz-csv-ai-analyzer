"use client";

import { useCallback, useState } from "react";
import { Upload, File, X, AlertCircle } from "lucide-react";

interface FileUploadProps {
  onFileLoaded: (content: string, fileName: string) => void;
  currentFileName?: string;
  onClear: () => void;
}

export function FileUpload({
  onFileLoaded,
  currentFileName,
  onClear,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        setError("Please upload a CSV file");
        return;
      }

      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileLoaded(content, file.name);
      };
      reader.onerror = () => {
        setError("Error reading file");
      };
      reader.readAsText(file);
    },
    [onFileLoaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  if (currentFileName) {
    return (
      <div className="glass-card animate-fade-in p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-3">
              <File className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-white">{currentFileName}</p>
              <p className="text-sm text-gray-400">File loaded</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-2 rounded-xl border-2 border-red-500 bg-red-600 px-4 py-2.5 font-medium text-white shadow-lg shadow-red-500/25 transition-all duration-200 hover:bg-red-500"
            title="Remove file"
          >
            <X className="h-4 w-4" />
            <span className="text-sm">Clear</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label
        className={`glass-card glass-card-hover block cursor-pointer p-8 text-center transition-all duration-300 ${
          isDragging ? "bg-violet-500/10 ring-2 ring-violet-500" : ""
        } `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-4">
          <div
            className={`rounded-2xl p-4 transition-all duration-300 ${
              isDragging
                ? "scale-110 bg-violet-500/20"
                : "border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-purple-500/10"
            } `}
          >
            <Upload
              className={`h-8 w-8 ${isDragging ? "text-violet-400" : "text-violet-500"}`}
            />
          </div>
          <div>
            <p className="mb-1 text-lg font-medium text-white">
              {isDragging ? "Drop your file here" : "Drag & drop your CSV file"}
            </p>
            <p className="text-sm text-gray-400">or click to browse files</p>
          </div>
        </div>
      </label>

      {error && (
        <div className="animate-fade-in flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
