/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DocumentType = 'Payslip' | 'Form106' | 'BankStatement' | 'Pension';

export interface CatalogItem {
  id: string; // Unique internal ID
  driveFileId: string; // Google Drive file ID
  fileName: string; // Renamed file on Drive, e.g., 2025_05_DanFactor_Payslip.pdf
  originalName: string; // Original uploaded file name
  year: string; // E.g., "2024", "2025", "2026"
  month: string; // "Jan", "Feb", ..., "Dec", or "Annual"
  employer: string; // Employer or provider name
  docType: DocumentType; // Payslip / Form 106 / Bank Statement / Pension
  fileSize: number; // File size in bytes
  uploadedAt: string; // ISO timestamp
}

export interface CatalogState {
  version: string;
  items: CatalogItem[];
  lastSyncedAt?: string;
}

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  'Annual'
];

export const DOCUMENT_TYPES: { value: DocumentType; labelHeb: string; labelEng: string }[] = [
  { value: 'Payslip', labelHeb: 'תלוש שכר (Payslip)', labelEng: 'Payslip' },
  { value: 'Form106', labelHeb: 'טופס 106 (Form 106)', labelEng: 'Form 106' },
  { value: 'BankStatement', labelHeb: 'עו"ש / בנק (Bank Statement)', labelEng: 'Bank Statement' },
  { value: 'Pension', labelHeb: 'פנסיה / קופת גמל (Pension)', labelEng: 'Pension' }
];

export const YEARS = ['2023', '2024', '2025', '2026', '2027'];
