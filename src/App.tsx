/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Loader2,
  FileText,
  Building,
  Calendar,
  CloudCheck,
  AlertCircle,
  HelpCircle,
  FolderOpen
} from 'lucide-react';

import Header from './components/Header';
import UploadTagger from './components/UploadTagger';
import CatalogTable from './components/CatalogTable';
import StateControls from './components/StateControls';

import { initAuth, googleSignIn, logout, setAccessToken } from './firebase';
import {
  getOrCreateFintoCheckFolder,
  uploadFileToDrive,
  deleteFileFromDrive,
  downloadFileFromDrive,
  saveCatalogStateToDrive,
  findCatalogStateFile,
  downloadCatalogState
} from './googleDrive';
import { CatalogState, CatalogItem, DocumentType } from './types';

const LOCAL_STORAGE_KEY = 'fintocheck_state';

const initialCatalogState: CatalogState = {
  version: '0.1.0',
  items: [],
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setLocalAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App State
  const [state, setState] = useState<CatalogState>(initialCatalogState);
  const [fintoCheckFolderId, setFintoCheckFolderId] = useState<string | null>(null);

  // Status indicators
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'unsaved' | 'offline' | 'needs-reauth'>('offline');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Load initial state from Local Storage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.items)) {
          setState(parsed);
        }
      } catch (err) {
        console.error('Failed to parse local storage state:', err);
      }
    }
    setIsInitialLoading(false);
  }, []);

  // 2. Persist state changes to Local Storage
  useEffect(() => {
    if (!isInitialLoading) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isInitialLoading]);

  // 3. Initialize Firebase Auth and listen for user session
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setNeedsAuth(false);
        if (token) {
          setLocalAccessToken(token);
          setAccessToken(token);
          setSyncStatus('unsaved');
          triggerToast(`Connected securely as ${currentUser.displayName || currentUser.email}`);
        } else {
          // Logged in with Firebase, but OAuth token was lost (e.g. page refresh)
          setSyncStatus('needs-reauth');
        }
      },
      () => {
        setUser(null);
        setLocalAccessToken(null);
        setAccessToken(null);
        setNeedsAuth(true);
        setSyncStatus('offline');
      }
    );

    return () => unsubscribe();
  }, []);

  // 4. Automatically locate/create folder and download catalog_state.json upon successful Google Auth
  useEffect(() => {
    if (user && accessToken) {
      autoDiscoverCloudState(accessToken);
    }
  }, [user, accessToken]);

  const autoDiscoverCloudState = async (token: string) => {
    setSyncStatus('syncing');
    try {
      // Find or create 'FintoCheck' folder
      const folderId = await getOrCreateFintoCheckFolder(token);
      setFintoCheckFolderId(folderId);

      // Look for any existing catalog_state.json inside this folder
      const catalogFileId = await findCatalogStateFile(token, folderId);
      if (catalogFileId) {
        const cloudState = await downloadCatalogState(token, catalogFileId);
        if (cloudState && cloudState.items) {
          // Found existing state on Google Drive! Auto-restore / merge with local storage
          // If local storage has items not in cloud, we can keep them (and sync them later)
          // For safety, we merge the lists based on unique driveFileId or internal id.
          setState((prev) => {
            const mergedItems = [...cloudState.items];
            
            // Add items from local state that are not in cloud state
            prev.items.forEach((localItem) => {
              const alreadyExists = mergedItems.some(
                (cloudItem) => cloudItem.driveFileId === localItem.driveFileId
              );
              if (!alreadyExists) {
                mergedItems.push(localItem);
              }
            });

            return {
              ...cloudState,
              items: mergedItems,
              lastSyncedAt: cloudState.lastSyncedAt || new Date().toISOString()
            };
          });
          
          triggerToast('Synced database history successfully from your Google Drive!', 'success');
        }
      } else {
        // First-time setup: FintoCheck folder created but no catalog file exists yet.
        // Let's create an initial catalog file in Drive
        await saveCatalogStateToDrive(token, folderId, state);
      }
      setSyncStatus('synced');
    } catch (err) {
      console.error('Error in auto discover cloud state:', err);
      setSyncStatus('unsaved');
      triggerToast('Google Drive folder is active, but auto-sync failed. Try syncing manually.', 'error');
    }
  };

  // Google Authentication Trigger
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setLocalAccessToken(result.accessToken);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        setSyncStatus('unsaved');
      }
    } catch (err) {
      console.error('Sign in error:', err);
      triggerToast('Authentication failed. Ensure pop-ups are allowed.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Trigger
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setLocalAccessToken(null);
      setAccessToken(null);
      setFintoCheckFolderId(null);
      setNeedsAuth(true);
      setSyncStatus('offline');
      // We do NOT clear localStorage catalog so they can still browse locally!
      triggerToast('Signed out of Google Drive safely.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Push full catalog state to Google Drive
  const syncStateToDrive = async (targetState: CatalogState, token: string, folderId: string) => {
    setSyncStatus('syncing');
    try {
      const updatedState = {
        ...targetState,
        lastSyncedAt: new Date().toISOString()
      };
      await saveCatalogStateToDrive(token, folderId, updatedState);
      setState(updatedState);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to sync catalog file:', err);
      setSyncStatus('unsaved');
      triggerToast('Cloud catalog sync failed. Retry using the sync button.', 'error');
    }
  };

  // Handle manual force sync button
  const handleForceSync = async () => {
    if (!accessToken || !fintoCheckFolderId) {
      triggerToast('Connect Google Drive to enable cloud backup.', 'error');
      return;
    }
    triggerToast('Synchronizing files and catalog to Drive...', 'info');
    await syncStateToDrive(state, accessToken, fintoCheckFolderId);
    triggerToast('Everything is synced and secure!', 'success');
  };

  // Handle local backup import
  const handleImportState = (newState: CatalogState) => {
    setState(newState);
    triggerToast('Imported backup locally!', 'success');
    
    // If connected to Google Drive, instantly push changes
    if (accessToken && fintoCheckFolderId) {
      syncStateToDrive(newState, accessToken, fintoCheckFolderId);
    } else {
      setSyncStatus('unsaved');
    }
  };

  // Handle manual full Cloud Restore (force pull state from Google Drive)
  const handleForceCloudRecovery = async () => {
    if (!accessToken) {
      triggerToast('Please connect to Google Drive first.', 'error');
      return;
    }
    setIsRecovering(true);
    try {
      const folderId = await getOrCreateFintoCheckFolder(accessToken);
      setFintoCheckFolderId(folderId);
      
      const fileId = await findCatalogStateFile(accessToken, folderId);
      if (fileId) {
        const cloudState = await downloadCatalogState(accessToken, fileId);
        if (cloudState) {
          setState(cloudState);
          setSyncStatus('synced');
          triggerToast('Successfully reloaded your entire index from Google Drive!', 'success');
        } else {
          triggerToast('Catalog file was empty or corrupted in Google Drive.', 'error');
        }
      } else {
        triggerToast('No catalog state file found on Google Drive. Let\'s sync your current state.', 'info');
        await syncStateToDrive(state, accessToken, folderId);
      }
    } catch (err) {
      console.error('Cloud recovery error:', err);
      triggerToast('Failed to retrieve backup database from Drive.', 'error');
    } finally {
      setIsRecovering(false);
    }
  };

  // Handle new Document Upload & tagging
  const handleUploadDocument = async (
    file: File,
    metadata: { year: string; month: string; employer: string; docType: DocumentType; customName: string }
  ) => {
    if (!accessToken || !fintoCheckFolderId) {
      triggerToast('Please connect to Google Drive to upload files.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Stream direct file binary stream to Google Drive inside 'FintoCheck'
      const driveFileId = await uploadFileToDrive(
        accessToken,
        fintoCheckFolderId,
        file,
        metadata.customName
      );

      // 2. Assemble new indexed CatalogItem
      const newItem: CatalogItem = {
        id: Math.random().toString(36).substring(2, 11),
        driveFileId,
        fileName: metadata.customName,
        originalName: file.name,
        year: metadata.year,
        month: metadata.month,
        employer: metadata.employer,
        docType: metadata.docType,
        fileSize: file.size,
        uploadedAt: new Date().toISOString()
      };

      // 3. Update active state
      const updatedState = {
        ...state,
        items: [newItem, ...state.items]
      };
      
      setState(updatedState);
      
      // 4. Synchronize state file back to Drive immediately
      await syncStateToDrive(updatedState, accessToken, fintoCheckFolderId);
      triggerToast(`"${metadata.customName}" cataloged and saved!`, 'success');
    } catch (err) {
      console.error('File Upload Error:', err);
      triggerToast('Failed to upload file. Check storage limits.', 'error');
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  // Download document from Drive
  const handleDownloadItem = async (item: CatalogItem) => {
    if (!accessToken) {
      triggerToast('Please connect to Google Drive to download files.', 'error');
      return;
    }
    
    setIsDownloadingId(item.id);
    try {
      await downloadFileFromDrive(accessToken, item.driveFileId, item.fileName);
    } catch (err) {
      console.error('Download item error:', err);
      triggerToast('Could not fetch file from Google Drive.', 'error');
    } finally {
      setIsDownloadingId(null);
    }
  };

  // Delete document from Drive and state
  const handleDeleteItem = async (item: CatalogItem) => {
    if (!accessToken || !fintoCheckFolderId) {
      triggerToast('Please connect to Google Drive to delete files.', 'error');
      return;
    }

    setIsDownloadingId(item.id);
    try {
      // 1. Delete file physically from Google Drive
      await deleteFileFromDrive(accessToken, item.driveFileId);

      // 2. Remove from active catalog state
      const updatedItems = state.items.filter((i) => i.id !== item.id);
      const updatedState = {
        ...state,
        items: updatedItems
      };
      
      setState(updatedState);

      // 3. Sync catalog file to Google Drive
      await syncStateToDrive(updatedState, accessToken, fintoCheckFolderId);
      triggerToast('Document deleted permanently from Google Drive and index.', 'success');
    } catch (err) {
      console.error('Delete error:', err);
      triggerToast('Failed to delete file. It may have already been removed.', 'error');
    } finally {
      setIsDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      
      {/* Navigation Header */}
      <Header
        user={user}
        needsAuth={needsAuth}
        isLoggingIn={isLoggingIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        syncStatus={syncStatus}
        onForceSync={handleForceSync}
      />

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Toast Toast alerts */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-20 right-4 sm:right-8 z-50 p-4 rounded-xl shadow-lg border max-w-sm flex items-center gap-3 ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="shrink-0">
                {toast.type === 'success' ? (
                  <CloudCheck className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome Banner Cards */}
        <div className="bg-gradient-to-r from-brand-800 to-brand-950 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          
          {/* Subtle Abstract Wave Vector for premium aesthetic */}
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,100 C30,40 70,60 100,0 L100,100 Z" fill="white"></path>
            </svg>
          </div>

          <div className="relative z-10 max-w-2xl space-y-2">
            <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
              Absolute custody over your financial document archives.
            </h2>
            <p className="text-xs sm:text-sm text-brand-100 leading-relaxed font-sans">
              FintoCheck-Base runs entirely in your browser, connecting your local database directly with your personal Google Drive account. Your payslips, bank accounts, and tax summaries stay 100% private, indexed, and cataloged exactly the way you want.
            </p>
            
            {/* Re-authenticate notification banner */}
            {syncStatus === 'needs-reauth' && (
              <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-200 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-medium mt-3">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Drive connection expired. Click "Connect Google Drive" to reactivate.</span>
              </div>
            )}
          </div>
        </div>

        {/* Application Functional Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Indexer & Upload controls */}
          <div className="lg:col-span-2 space-y-8">
            <UploadTagger
              onUpload={handleUploadDocument}
              isUploading={isUploading}
              isConnectedToDrive={!!accessToken}
            />
          </div>

          {/* Right Column: Database backups & cloud recovery metrics */}
          <div className="lg:col-span-1">
            <StateControls
              state={state}
              onImportState={handleImportState}
              onForceCloudRecovery={handleForceCloudRecovery}
              isRecovering={isRecovering}
              isConnectedToDrive={!!accessToken}
            />
          </div>

        </div>

        {/* Large bottom row: File Index Directory */}
        <div className="space-y-4">
          <CatalogTable
            items={state.items}
            onDownload={handleDownloadItem}
            onDelete={handleDeleteItem}
            isProcessingId={isDownloadingId}
          />
        </div>

      </main>

      {/* Premium Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="flex items-center gap-1">
            <span>Powered by secure Google OAuth 2.0 Client Custody.</span>
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Client Sandbox Mode</span>
            </span>
            <span>Version 0.1.0 (Stable)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
