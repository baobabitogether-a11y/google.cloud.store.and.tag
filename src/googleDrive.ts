/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatalogState } from './types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Common headers for Drive requests
 */
function getHeaders(token: string, contentType?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  return headers;
}

/**
 * Searches for the 'FintoCheck' folder in Google Drive.
 * Returns the folder ID if found, otherwise null.
 */
export async function findFintoCheckFolder(token: string): Promise<string | null> {
  const q = "mimeType = 'application/vnd.google-apps.folder' and name = 'FintoCheck' and trashed = false";
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
  
  try {
    const response = await fetch(url, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to query folder: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error finding FintoCheck folder:', error);
    throw error;
  }
}

/**
 * Creates the 'FintoCheck' folder in the root of Google Drive.
 * Returns the new folder ID.
 */
export async function createFintoCheckFolder(token: string): Promise<string> {
  const url = `${DRIVE_API_BASE}/files`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(token, 'application/json'),
      body: JSON.stringify({
        name: 'FintoCheck',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create folder: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error creating FintoCheck folder:', error);
    throw error;
  }
}

/**
 * Gets or creates the 'FintoCheck' folder.
 */
export async function getOrCreateFintoCheckFolder(token: string): Promise<string> {
  let folderId = await findFintoCheckFolder(token);
  if (!folderId) {
    folderId = await createFintoCheckFolder(token);
  }
  return folderId;
}

/**
 * Uploads a file (PDF, image, Excel, etc.) directly to Google Drive
 * inside the FintoCheck folder using a secure, high-performance multipart Blob upload.
 */
export async function uploadFileToDrive(
  token: string,
  folderId: string,
  file: File,
  customFileName: string
): Promise<string> {
  const url = `${UPLOAD_API_BASE}/files?uploadType=multipart`;
  
  const metadata = {
    name: customFileName,
    parents: [folderId],
    mimeType: file.type || 'application/octet-stream',
  };
  
  const boundary = 'fintocheck_multipart_boundary';
  const header = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--`;
  
  const headerBlob = new Blob([header], { type: 'text/plain' });
  const footerBlob = new Blob([footer], { type: 'text/plain' });
  const multipartBlob = new Blob([headerBlob, file, footerBlob], { type: `multipart/related; boundary=${boundary}` });
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(token, `multipart/related; boundary=${boundary}`),
      body: multipartBlob,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.id; // Returns the uploaded file's Drive ID
  } catch (error) {
    console.error('Error uploading file to Drive:', error);
    throw error;
  }
}

/**
 * Finds the `catalog_state.json` file in the FintoCheck folder.
 */
export async function findCatalogStateFile(token: string, folderId: string): Promise<string | null> {
  const q = `name = 'catalog_state.json' and '${folderId}' in parents and trashed = false`;
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
  
  try {
    const response = await fetch(url, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to query catalog_state.json: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error finding catalog file:', error);
    throw error;
  }
}

/**
 * Reads and parses the `catalog_state.json` file from Google Drive.
 */
export async function downloadCatalogState(token: string, fileId: string): Promise<CatalogState | null> {
  const url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;
  
  try {
    const response = await fetch(url, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download catalog: ${response.statusText}`);
    }
    
    const state: CatalogState = await response.json();
    return state;
  } catch (error) {
    console.error('Error downloading catalog state:', error);
    return null;
  }
}

/**
 * Saves (either creates or updates) the `catalog_state.json` in Google Drive.
 */
export async function saveCatalogStateToDrive(
  token: string,
  folderId: string,
  state: CatalogState
): Promise<string> {
  // 1. Check if the file already exists
  const fileId = await findCatalogStateFile(token, folderId);
  const jsonContent = JSON.stringify(state, null, 2);
  const mediaBlob = new Blob([jsonContent], { type: 'application/json' });
  
  if (fileId) {
    // 2. Perform a media update (PATCH)
    const url = `${UPLOAD_API_BASE}/files/${fileId}?uploadType=media`;
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: getHeaders(token, 'application/json'),
        body: mediaBlob,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update catalog file: ${response.statusText}`);
      }
      
      return fileId;
    } catch (error) {
      console.error('Error updating catalog in Drive:', error);
      throw error;
    }
  } else {
    // 3. Perform a multipart creation (POST)
    const url = `${UPLOAD_API_BASE}/files?uploadType=multipart`;
    const metadata = {
      name: 'catalog_state.json',
      parents: [folderId],
      mimeType: 'application/json',
    };
    
    const boundary = 'catalog_multipart_boundary';
    const header = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`;
    const footer = `\r\n--${boundary}--`;
    
    const headerBlob = new Blob([header], { type: 'text/plain' });
    const footerBlob = new Blob([footer], { type: 'text/plain' });
    const multipartBlob = new Blob([headerBlob, mediaBlob, footerBlob], { type: `multipart/related; boundary=${boundary}` });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(token, `multipart/related; boundary=${boundary}`),
        body: multipartBlob,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create catalog file: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Error creating catalog in Drive:', error);
      throw error;
    }
  }
}

/**
 * Downloads a binary file from Google Drive and prompts the browser to save/open it.
 */
export async function downloadFileFromDrive(token: string, fileId: string, fileName: string): Promise<void> {
  const url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;
  
  try {
    const response = await fetch(url, {
      headers: getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading file from Drive:', error);
    alert(`Failed to download file. Please check your connection.`);
  }
}

/**
 * Deletes a file from Google Drive by ID.
 */
export async function deleteFileFromDrive(token: string, fileId: string): Promise<void> {
  const url = `${DRIVE_API_BASE}/files/${fileId}`;
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete file from Drive: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting file from Drive:', error);
    throw error;
  }
}
