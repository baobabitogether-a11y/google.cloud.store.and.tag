/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User } from 'firebase/auth';
import { LogOut, ShieldCheck, RefreshCw, Cloud, CloudOff, AlertCircle } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  syncStatus: 'synced' | 'syncing' | 'unsaved' | 'offline' | 'needs-reauth';
  onForceSync?: () => void;
}

export default function Header({
  user,
  needsAuth,
  isLoggingIn,
  onLogin,
  onLogout,
  syncStatus,
  onForceSync,
}: HeaderProps) {
  const getSyncBadge = () => {
    switch (syncStatus) {
      case 'synced':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud Synced</span>
          </div>
        );
      case 'syncing':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Syncing to Drive...</span>
          </div>
        );
      case 'unsaved':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Pending Sync</span>
          </div>
        );
      case 'needs-reauth':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Reconnect Drive</span>
          </div>
        );
      case 'offline':
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <CloudOff className="w-3.5 h-3.5" />
            <span>Not Connected</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="bg-brand-600 text-white p-2.5 rounded-xl shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-lg sm:text-xl text-slate-900 tracking-tight">FintoCheck-Base</h1>
              <span className="text-[10px] font-semibold font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md uppercase border border-slate-200">v0.1.0</span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans hidden sm:block">Secure Personal Financial Document Catalog</p>
          </div>
        </div>

        {/* Auth / Sync Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Sync Status */}
              <div className="hidden xs:block">
                {getSyncBadge()}
              </div>

              {/* Force Sync Button */}
              {syncStatus !== 'offline' && onForceSync && (
                <button
                  onClick={onForceSync}
                  disabled={syncStatus === 'syncing'}
                  className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-50 rounded-lg border border-slate-200 disabled:opacity-50 transition-colors"
                  title="Force backup sync to Google Drive"
                >
                  <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                </button>
              )}

              {/* User Identity */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3 sm:pl-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                    {user.displayName ? user.displayName.charAt(0) : 'U'}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="text-xs font-medium text-slate-800 leading-none">
                    {user.displayName || 'Google User'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="gsi-material-button scale-95 origin-right cursor-pointer"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">{isLoggingIn ? 'Connecting...' : 'Connect Google Drive'}</span>
                </div>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
