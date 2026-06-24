/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Filter, Download, Trash2, FileText, Calendar, Building, Info, HelpCircle } from 'lucide-react';
import { CatalogItem, DocumentType, DOCUMENT_TYPES, YEARS, MONTHS } from '../types';

interface CatalogTableProps {
  items: CatalogItem[];
  onDownload: (item: CatalogItem) => void;
  onDelete: (item: CatalogItem) => void;
  isProcessingId: string | null; // Keeps track of which item is currently being deleted/downloaded
}

export default function CatalogTable({ items, onDownload, onDelete, isProcessingId }: CatalogTableProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Format File Size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Document Type badges styling helper
  const getDocTypeBadge = (type: DocumentType) => {
    switch (type) {
      case 'Payslip':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            Payslip / תלוש
          </span>
        );
      case 'Form106':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
            Form 106 / טופס 106
          </span>
        );
      case 'BankStatement':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
            Bank / עו"ש
          </span>
        );
      case 'Pension':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
            Pension / פנסיה
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
            {type}
          </span>
        );
    }
  };

  // Filter Logic
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.employer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.originalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || item.docType === selectedType;
    const matchesYear = selectedYear === 'ALL' || item.year === selectedYear;
    const matchesMonth = selectedMonth === 'ALL' || item.month === selectedMonth;
    return matchesSearch && matchesType && matchesYear && matchesMonth;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      
      {/* Title & Filter Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600" />
            <span>Document Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Showing {filteredItems.length} of {items.length} indexed financial documents
          </p>
        </div>

        {/* Free Text Search */}
        <div className="relative w-full md:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by Employer/Filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Advanced Filter Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 mb-6">
        
        {/* Document Type Select */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter Document Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full text-xs bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Types</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.labelEng}</option>
            ))}
          </select>
        </div>

        {/* Year Select */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full text-xs bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Years</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Month Select */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full text-xs bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Months</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m === 'Annual' ? 'Annual Only' : m}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Content Table Container */}
      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        {filteredItems.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-medium text-xs font-display">
                <th className="px-4 py-3 font-semibold">Document details</th>
                <th className="px-4 py-3 font-semibold">Metadata index</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Google Drive file</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  
                  {/* Title & Type */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 break-all">{item.originalName}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {getDocTypeBadge(item.docType)}
                          <span className="text-[10px] text-slate-400">({formatBytes(item.fileSize)})</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Metadata Tags */}
                  <td className="px-4 py-3.5">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-800 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{item.year} — {item.month}</span>
                      </span>
                      <span className="block text-xs text-slate-500 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{item.employer}</span>
                      </span>
                    </div>
                  </td>

                  {/* Google Drive Name */}
                  <td className="px-4 py-3.5 hidden sm:table-cell max-w-xs">
                    <div className="space-y-0.5">
                      <span className="text-xs font-mono text-brand-700 font-semibold truncate block" title={item.fileName}>
                        {item.fileName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Uploaded: {new Date(item.uploadedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {/* Download Button */}
                      <button
                        onClick={() => onDownload(item)}
                        disabled={isProcessingId === item.id}
                        className="p-2 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
                        title="Download file from personal Google Drive"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to permanently delete "${item.originalName}" from both your Google Drive and local catalog? This action cannot be undone.`)) {
                            onDelete(item);
                          }
                        }}
                        disabled={isProcessingId === item.id}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
                        title="Delete permanently from Drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 px-4 bg-slate-50/50">
            <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No matching files found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {items.length === 0
                ? 'Your secure directory is currently empty. Start by cataloging and uploading your first document!'
                : 'Try adjusting your search query, associated year, or document type filter.'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
