/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentType, MONTHS, DOCUMENT_TYPES, YEARS } from '../types';

interface UploadTaggerProps {
  onUpload: (file: File, metadata: { year: string; month: string; employer: string; docType: DocumentType; customName: string }) => Promise<void>;
  isUploading: boolean;
  isConnectedToDrive: boolean;
}

const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  Annual: 'Annual'
};

export default function UploadTagger({ onUpload, isUploading, isConnectedToDrive }: UploadTaggerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [year, setYear] = useState<string>('2025');
  const [month, setMonth] = useState<string>('Jan');
  const [employer, setEmployer] = useState<string>('');
  const [docType, setDocType] = useState<DocumentType>('Payslip');
  
  // Validation State
  const [validationError, setValidationError] = useState<string | null>(null);

  // Automatically select Annual if document is Form 106 (as per Hebrew standards)
  const handleDocTypeChange = (type: DocumentType) => {
    setDocType(type);
    if (type === 'Form106') {
      setMonth('Annual');
    } else if (month === 'Annual') {
      setMonth('Jan');
    }
  };

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setValidationError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setValidationError(null);
    }
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  // Clean and sanitize the employer name for file naming
  const getSanitizedEmployer = () => {
    if (!employer.trim()) return 'Employer';
    // Remove spaces, slashes, and special characters, convert to PascalCase/clean string
    return employer
      .trim()
      .replace(/[^a-zA-Z0-9\u0590-\u05fe\s-]/g, '') // Keep English, Hebrew numbers, spaces, hyphens
      .replace(/\s+/g, ''); // Remove spaces
  };

  // Compute standard dynamic filename
  const getComputedFileName = () => {
    if (!selectedFile) return '';
    const ext = selectedFile.name.split('.').pop() || 'pdf';
    const monthPart = MONTH_MAP[month] || month;
    const sanitizedEmployer = getSanitizedEmployer();
    return `${year}_${monthPart}_${sanitizedEmployer}_${docType}.${ext}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setValidationError('Please select a file to upload first.');
      return;
    }
    if (!employer.trim()) {
      setValidationError('Please enter an Employer or Provider Name.');
      return;
    }

    setValidationError(null);

    const customName = getComputedFileName();
    
    try {
      await onUpload(selectedFile, {
        year,
        month,
        employer: employer.trim(),
        docType,
        customName
      });
      // Clear file selection upon successful upload
      setSelectedFile(null);
      setEmployer('');
    } catch (err) {
      console.error('Upload Error:', err);
      setValidationError('Failed to upload file to Google Drive. Check permissions.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
        <UploadCloud className="w-5 h-5 text-brand-600" />
        <span>Catalog & Upload Document</span>
      </h2>

      {!isConnectedToDrive && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3 text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold">Google Drive Connection Required</p>
            <p className="mt-0.5">Please click "Connect Google Drive" in the header to authenticate and securely upload files to your own cloud storage.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Dropzone File Selector */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={selectedFile ? undefined : handleSelectClick}
          className={`relative border-2 border-dashed rounded-xl p-6 transition-all text-center flex flex-col items-center justify-center min-h-[140px] ${
            selectedFile
              ? 'border-emerald-300 bg-emerald-50/20'
              : dragActive
              ? 'border-brand-500 bg-brand-50/30'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
            disabled={!isConnectedToDrive || isUploading}
          />

          <AnimatePresence mode="wait">
            {selectedFile ? (
              <motion.div
                key="selected"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center"
              >
                <div className="bg-emerald-100 text-emerald-700 p-3 rounded-full mb-3">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-slate-800 max-w-xs truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB — ready to catalog
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium hover:underline bg-white px-2.5 py-1.5 rounded-md border border-slate-200"
                  disabled={isUploading}
                >
                  Change File
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <UploadCloud className={`w-10 h-10 mb-2 ${isConnectedToDrive ? 'text-slate-400' : 'text-slate-300'}`} />
                <p className="text-sm font-medium text-slate-700">
                  {isConnectedToDrive ? 'Drag and drop your file here, or click to browse' : 'Sign in to select files'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports PDF, Excel, and images (max 10MB)
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Form Inputs (Tagging Metadata) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Associated Year */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Associated Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              disabled={!isConnectedToDrive || isUploading}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Associated Month */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Associated Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              disabled={!isConnectedToDrive || isUploading || docType === 'Form106'}
            >
              {MONTHS.map((m) => (
                <option key={m} value={m} disabled={docType === 'Form106' && m !== 'Annual'}>
                  {m === 'Annual' ? 'Annual (Form 106)' : m}
                </option>
              ))}
            </select>
          </div>

          {/* Document Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Document Type</label>
            <select
              value={docType}
              onChange={(e) => handleDocTypeChange(e.target.value as DocumentType)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              disabled={!isConnectedToDrive || isUploading}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.labelEng} / {type.labelHeb}
                </option>
              ))}
            </select>
          </div>

          {/* Employer / Provider Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Employer / Provider</label>
            <input
              type="text"
              placeholder="e.g., Dan Factor, Bank Hapoalim"
              value={employer}
              onChange={(e) => setEmployer(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              disabled={!isConnectedToDrive || isUploading}
              required
            />
          </div>

        </div>

        {/* Dynamic File Renaming Convention Preview */}
        {selectedFile && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <span className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Standard Drive Renaming Output:</span>
            </span>
            <div className="font-mono text-xs text-brand-700 break-all select-all font-semibold">
              FintoCheck/ {getComputedFileName()}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
              * FintoCheck enforces standard structured naming on your Google Drive to guarantee seamless search, recovery, and immediate AI parsing compatibility.
            </p>
          </div>
        )}

        {/* Error Notification */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Submit Upload Button */}
        <button
          type="submit"
          disabled={!isConnectedToDrive || isUploading || !selectedFile}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Cataloging & Saving to Drive...</span>
            </>
          ) : (
            <>
              <span>Index & Upload File</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}
