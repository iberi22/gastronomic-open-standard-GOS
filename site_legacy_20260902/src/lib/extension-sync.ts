/**
 * Extension Sync Module
 * =====================
 * Sincroniza datos entre Chrome Extension (chrome.storage.local)
 * y el PWA (IndexedDB via user-db)
 * 
 * Permite que los datos extraídos por la extensión aparezcan
 * automáticamente en el PWA.
 */

import { userDB } from './user-db';

const STORAGE_KEY = 'gos_extension_sync';
const SYNC_INTERVAL = 5000; // 5 seconds

interface SyncState {
  lastSync: string;
  placesCount: number;
  reviewsCount: number;
  status: 'idle' | 'syncing' | 'error';
}

class ExtensionSync {
  private isRunning = false;
  private intervalId: number | null = null;
  
  /**
   * Inicia la sincronización automática
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    // Solo funciona si estamos en Chrome
    if (!this.isChrome()) {
      console.log('ExtensionSync: Not in Chrome, skipping');
      return;
    }
    
    this.isRunning = true;
    console.log('ExtensionSync: Started');
    
    // Sincronización inicial
    await this.sync();
    
    // Sincronización periódica
    this.intervalId = window.setInterval(() => {
      this.sync();
    }, SYNC_INTERVAL);
  }
  
  /**
   * Detiene la sincronización
   */
  stop(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('ExtensionSync: Stopped');
  }
  
  /**
   * Sincroniza datos de la extensión al PWA
   */
  async sync(): Promise<SyncState> {
    const state: SyncState = {
      lastSync: new Date().toISOString(),
      placesCount: 0,
      reviewsCount: 0,
      status: 'syncing'
    };
    
    try {
      // Obtener datos de chrome.storage
      const extensionData = await this.getExtensionData();
      
      if (!extensionData) {
        state.status = 'idle';
        return state;
      }
      
      const places = extensionData.places || [];
      const reviews = extensionData.reviews || [];
      
      // Guardar lugares en user-db
      for (const place of places) {
        await userDB.saveScrapedPlace(place);
      }
      
      // Guardar reviews en user-db
      for (const review of reviews) {
        await userDB.saveScrapedReview(review);
      }
      
      // Guardar estado de sync
      state.placesCount = places.length;
      state.reviewsCount = reviews.length;
      state.status = 'idle';
      
      // Guardar último sync
      await this.saveSyncState(state);
      
      console.log(`ExtensionSync: Synced ${places.length} places, ${reviews.length} reviews`);
      
    } catch (error) {
      state.status = 'error';
      console.error('ExtensionSync: Sync error', error);
    }
    
    return state;
  }
  
  /**
   * Obtiene datos de chrome.storage.local de la extensión
   */
  private async getExtensionData(): Promise<any | null> {
    return new Promise((resolve) => {
      // En Chrome, chrome.storage está disponible
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['places', 'reviews'], (data) => {
          resolve(data);
        });
      } else {
        // En desarrollo, leer del localStorage de la extensión
        const extData = localStorage.getItem('gos_extension_data');
        resolve(extData ? JSON.parse(extData) : null);
      }
    });
  }
  
  /**
   * Guarda estado de sincronización
   */
  private async saveSyncState(state: SyncState): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  
  /**
   * Obtiene último estado de sync
   */
  async getLastSyncState(): Promise<SyncState | null> {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }
  
  /**
   * Fuerza una sincronización inmediata
   */
  async forceSync(): Promise<SyncState> {
    return this.sync();
  }
  
  /**
   * Verifica si estamos en Chrome
   */
  private isChrome(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  }
  
  /**
   * Solicita datos a la extensión (via message passing)
   */
  async requestFromExtension(): Promise<any> {
    return new Promise((resolve) => {
      if (this.isChrome() && chrome.runtime) {
        chrome.runtime.sendMessage({ action: 'getData' }, (response) => {
          resolve(response);
        });
      } else {
        resolve(null);
      }
    });
  }
  
  /**
   * Abre la extensión
   */
  async openExtension(): Promise<void> {
    if (this.isChrome() && chrome.runtime) {
      // Abrir popup de la extensión
      chrome.runtime.sendMessage({ action: 'openPopup' });
    }
  }
  
  /**
   * Escucha mensajes de la extensión
   */
  listenToMessages(callback: (data: any) => void): void {
    if (this.isChrome() && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
        if (message.action === 'newDataAvailable') {
          this.sync().then(callback);
        }
      });
    }
  }
  
  /**
   * Verifica si la extensión está instalada
   */
  async isExtensionInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isChrome()) {
        resolve(false);
        return;
      }
      
      chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
        resolve(response === 'pong');
      });
    });
  }
  
  /**
   * Limpia todos los datos de sync
   */
  async clearAll(): Promise<void> {
    // Limpiar datos de extensión
    if (this.isChrome() && chrome.storage) {
      chrome.storage.local.set({ places: [], reviews: [] });
    }
    
    // Limpiar estado local
    localStorage.removeItem(STORAGE_KEY);
    
    console.log('ExtensionSync: Cleared all data');
  }
}

// Export singleton
export const extensionSync = new ExtensionSync();
export default extensionSync;