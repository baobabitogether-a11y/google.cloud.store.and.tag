/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Download, Upload, RefreshCw, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { CatalogState } from '../types';

interface StateControlsProps {
  state: CatalogState;
  onImportState: (newState: CatalogState) => void;
  onForceCloudRecovery: () => Promise<void>;
  isRecovering: boolean;
  isConnectedToDrive: boolean;
}

export default function StateControls({
  state,
  onImportState,
  onForceCloudRecovery,
  isRecovering,
  isConnectedToDrive
}: StateControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  // Handle local export (download catalog_state.json)
  const handleExportLocal = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "catalog_state.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Failed to export state locally:', err);
    }
  };

  // Handle local import (upload/parse catalog_state.json)
  const handleImportLocalClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          
          // Basic validation
          if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
            throw new Error('Invalid file schema. Missing "items" array.');
          }
          
          onImportState(parsed);
          setImportSuccess(true);
          setTimeout(() => setImportSuccess(false), 3000);
        } catch (err: any) {
          console.error('Import local file error:', err);
          setImportError(err.message || 'Malformed catalog JSON file.');
        }
      };
      
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      
      {/* Title */}
      <div>
        <h2 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-brand-600" />
          <span>Data Custody & Backups</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Maintain full ownership over your document catalog records.
        </p>
      </div>

      {/* Backup Sync Summary */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Indexed</span>
          <span className="text-2xl font-display font-bold text-slate-800">{state.items.length}</span>
          <span className="text-xs text-slate-500 block mt-0.5">Documents</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Synced</span>
          <span className="text-sm font-semibold text-slate-800 block mt-1 truncate">
            {state.lastSyncedAt ? new Date(state.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {state.lastSyncedAt ? new Date(state.lastSyncedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Sync pending'}
          </span>
        </div>
      </div>

      {/* Cloud Restore Controller */}
      {isConnectedToDrive && (
        <div className="bg-brand-50/50 border border-brand-100 rounded-xl p-4 space-y-3">
          <div>
            <h3 className="text-xs font-bold text-brand-900">Cloud Storage Recovery</h3>
            <p className="text-xs text-brand-700 mt-1 leading-relaxed">
              Logging in from a new device? Force reload your catalog database directly from your personal Google Drive to restore your index instantly.
            </p>
          </div>
          <button
            onClick={onForceCloudRecovery}
            disabled={isRecovering}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-xs py-2 px-3.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecovering ? 'animate-spin' : ''}`} />
            <span>{isRecovering ? 'Restoring state...' : 'Force Cloud Recovery'}</span>
          </button>
        </div>
      )}

      {/* Local Export & Import Buttons */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700">Offline Portability</h3>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Export Local */}
          <button
            onClick={handleExportLocal}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs py-2 px-3 border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup (JSON)</span>
          </button>

          {/* Import Local */}
          <button
            onClick={handleImportLocalClick}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs py-2 px-3 border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Backup</span>
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportLocalFile}
          />
        </div>

        {/* Local Import Status Feedbacks */}
        {importError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}
        {importSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-xs flex gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 animate-bounce" />
            <span>Local catalog index restored successfully!</span>
          </div>
        )}
      </div>

    </div>
  );
}
