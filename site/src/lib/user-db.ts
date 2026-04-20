/**
 * GOS User Database
 * =================
 * Base de datos local PRIVADA del usuario.
 * 
 * Esta base de datos NUNCA se sincroniza con otros nodos.
 * Es solo para uso local del usuario.
 * 
 * Almacena:
 * - Preferencias del usuario
 * - Recetas favoritas
 * - Calificaciones privadas (que no quiere compartir)
 * - Historial de navegación
 * - Datos de perfil
 */

declare const indexedDB: IDBFactory;

const DB_NAME = 'gos_user_db';
const DB_VERSION = 1;

interface GOSUserProfile {
  id: string;
  displayName: string;
  email?: string; // Solo hash guardado
  createdAt: string;
  updatedAt: string;
  preferences: GOSUserPreferences;
}

interface GOSUserPreferences {
  language: string;
  country: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoSync: boolean;
  defaultView: 'grid' | 'list' | 'map';
  filters: {
    minRating: number;
    categories: string[];
    priceRange: [number, number];
  };
}

interface GOSFavorite {
  id: string;
  type: 'recipe' | 'product' | 'place' | 'ingredient';
  itemId: string;
  itemName: string;
  addedAt: string;
  notes?: string;
  tags?: string[];
}

interface GOSPrivateRating {
  id: string;
  itemId: string;
  itemType: 'recipe' | 'product' | 'place' | 'ingredient';
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

interface GOSComment {
  id: string;
  itemId: string;
  itemType: 'recipe' | 'product' | 'place' | 'ingredient';
  text: string;
  createdAt: string;
  isPublic: boolean;
  likes: number;
}

interface GOSRecipeCollection {
  id: string;
  name: string;
  description?: string;
  recipeIds: string[];
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

interface GOSBrowsingHistory {
  id: string;
  itemId: string;
  itemType: 'recipe' | 'product' | 'place' | 'ingredient';
  itemName: string;
  visitedAt: string;
  duration?: number; // seconds
}

interface GOSShoppingList {
  id: string;
  name: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    unit?: string;
    checked: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

class GOSUserDatabase {
  private db: IDBDatabase | null = null;
  private dbName: string;
  
  constructor(dbName: string = DB_NAME) {
    this.dbName = dbName;
  }
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // User profile (single record)
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'id' });
        }
        
        // Favorites
        if (!db.objectStoreNames.contains('favorites')) {
          const store = db.createObjectStore('favorites', { keyPath: 'id' });
          store.createIndex('itemId', 'itemId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
        
        // Private ratings
        if (!db.objectStoreNames.contains('ratings')) {
          const store = db.createObjectStore('ratings', { keyPath: 'id' });
          store.createIndex('itemId', 'itemId', { unique: false });
          store.createIndex('isPublic', 'isPublic', { unique: false });
        }
        
        // Comments
        if (!db.objectStoreNames.contains('comments')) {
          const store = db.createObjectStore('comments', { keyPath: 'id' });
          store.createIndex('itemId', 'itemId', { unique: false });
          store.createIndex('isPublic', 'isPublic', { unique: false });
        }
        
        // Recipe collections
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', { keyPath: 'id' });
        }
        
        // Browsing history
        if (!db.objectStoreNames.contains('history')) {
          const store = db.createObjectStore('history', { keyPath: 'id' });
          store.createIndex('visitedAt', 'visitedAt', { unique: false });
          store.createIndex('itemId', 'itemId', { unique: false });
        }
        
        // Shopping lists
        if (!db.objectStoreNames.contains('shopping_lists')) {
          db.createObjectStore('shopping_lists', { keyPath: 'id' });
        }
        
        // Scraped data (from extension)
        if (!db.objectStoreNames.contains('scraped_places')) {
          const store = db.createObjectStore('scraped_places', { keyPath: 'id' });
          store.createIndex('source', 'source', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('scraped_reviews')) {
          const store = db.createObjectStore('scraped_reviews', { keyPath: 'id' });
          store.createIndex('itemId', 'itemId', { unique: false });
        }
      };
    });
  }
  
  // Profile methods
  async getProfile(): Promise<GOSUserProfile | null> {
    return this.get('profile', 'default');
  }
  
  async saveProfile(profile: GOSUserProfile): Promise<void> {
    profile.updatedAt = new Date().toISOString();
    return this.put('profile', profile);
  }
  
  // Favorites methods
  async getFavorites(type?: string): Promise<GOSFavorite[]> {
    if (type) {
      return this.getAllByIndex('favorites', 'type', type);
    }
    return this.getAll('favorites');
  }
  
  async addFavorite(favorite: Omit<GOSFavorite, 'id' | 'addedAt'>): Promise<GOSFavorite> {
    const fav: GOSFavorite = {
      ...favorite,
      id: this.generateId(),
      addedAt: new Date().toISOString()
    };
    await this.put('favorites', fav);
    return fav;
  }
  
  async removeFavorite(itemId: string): Promise<void> {
    const favorites = await this.getAllByIndex('favorites', 'itemId', itemId);
    const tx = this.db!.transaction('favorites', 'readwrite');
    for (const fav of favorites) {
      tx.store.delete(fav.id);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  async isFavorite(itemId: string): Promise<boolean> {
    const favorites = await this.getAllByIndex('favorites', 'itemId', itemId);
    return favorites.length > 0;
  }
  
  // Ratings methods
  async getRatings(itemId?: string, includePublicOnly = false): Promise<GOSPrivateRating[]> {
    if (itemId) {
      const ratings = await this.getAllByIndex('ratings', 'itemId', itemId);
      return includePublicOnly ? ratings.filter(r => r.isPublic) : ratings;
    }
    const ratings = await this.getAll('ratings');
    return includePublicOnly ? ratings.filter(r => r.isPublic) : ratings;
  }
  
  async saveRating(rating: Omit<GOSPrivateRating, 'id' | 'createdAt' | 'updatedAt'>): Promise<GOSPrivateRating> {
    const existing = await this.getAllByIndex('ratings', 'itemId', rating.itemId);
    const existingRating = existing.find(r => r.itemType === rating.itemType);
    
    const fullRating: GOSPrivateRating = {
      ...rating,
      id: existingRating?.id || this.generateId(),
      createdAt: existingRating?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.put('ratings', fullRating);
    return fullRating;
  }
  
  async deleteRating(id: string): Promise<void> {
    return this.delete('ratings', id);
  }
  
  // Comments methods
  async getComments(itemId?: string, includePublicOnly = false): Promise<GOSComment[]> {
    if (itemId) {
      const comments = await this.getAllByIndex('comments', 'itemId', itemId);
      return includePublicOnly ? comments.filter(c => c.isPublic) : comments;
    }
    const comments = await this.getAll('comments');
    return includePublicOnly ? comments.filter(c => c.isPublic) : comments;
  }
  
  async saveComment(comment: Omit<GOSComment, 'id' | 'createdAt' | 'likes'>): Promise<GOSComment> {
    const fullComment: GOSComment = {
      ...comment,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      likes: 0
    };
    await this.put('comments', fullComment);
    return fullComment;
  }
  
  // Collections methods
  async getCollections(): Promise<GOSRecipeCollection[]> {
    return this.getAll('collections');
  }
  
  async createCollection(name: string, description?: string): Promise<GOSRecipeCollection> {
    const collection: GOSRecipeCollection = {
      id: this.generateId(),
      name,
      description,
      recipeIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false
    };
    await this.put('collections', collection);
    return collection;
  }
  
  async addToCollection(collectionId: string, recipeId: string): Promise<void> {
    const collection = await this.get<GOSRecipeCollection>('collections', collectionId);
    if (collection && !collection.recipeIds.includes(recipeId)) {
      collection.recipeIds.push(recipeId);
      collection.updatedAt = new Date().toISOString();
      await this.put('collections', collection);
    }
  }
  
  // History methods
  async addToHistory(item: Omit<GOSBrowsingHistory, 'id' | 'visitedAt'>): Promise<void> {
    const entry: GOSBrowsingHistory = {
      ...item,
      id: this.generateId(),
      visitedAt: new Date().toISOString()
    };
    await this.put('history', entry);
  }
  
  async getHistory(limit = 50): Promise<GOSBrowsingHistory[]> {
    const all = await this.getAll('history');
    return all.sort((a, b) => 
      new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
    ).slice(0, limit);
  }
  
  async clearHistory(): Promise<void> {
    return this.clear('history');
  }
  
  // Shopping list methods
  async getShoppingLists(): Promise<GOSShoppingList[]> {
    return this.getAll('shopping_lists');
  }
  
  async createShoppingList(name: string): Promise<GOSShoppingList> {
    const list: GOSShoppingList = {
      id: this.generateId(),
      name,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.put('shopping_lists', list);
    return list;
  }
  
  async addToShoppingList(listId: string, item: GOSShoppingList['items'][0]): Promise<void> {
    const list = await this.get<GOSShoppingList>('shopping_lists', listId);
    if (list) {
      list.items.push(item);
      list.updatedAt = new Date().toISOString();
      await this.put('shopping_lists', list);
    }
  }
  
  // Scraped data methods (from Chrome extension)
  async saveScrapedPlace(place: any): Promise<void> {
    await this.put('scraped_places', place);
  }
  
  async getScrapedPlaces(): Promise<any[]> {
    return this.getAll('scraped_places');
  }
  
  async saveScrapedReview(review: any): Promise<void> {
    await this.put('scraped_reviews', review);
  }
  
  async getScrapedReviews(): Promise<any[]> {
    return this.getAll('scraped_reviews');
  }
  
  // Generic CRUD methods
  private async get<T>(storeName: string, key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  
  private async getAll(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  private async getAllByIndex(storeName: string, indexName: string, value: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  private async put(storeName: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  private async delete(storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  private async clear(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  
  async exportAll(): Promise<any> {
    return {
      exportedAt: new Date().toISOString(),
      profile: await this.get('profile', 'default'),
      favorites: await this.getAll('favorites'),
      ratings: await this.getAll('ratings'),
      comments: await this.getAll('comments'),
      collections: await this.getAll('collections'),
      history: await this.getAll('history'),
      shoppingLists: await this.getAll('shopping_lists'),
      scrapedPlaces: await this.getAll('scraped_places'),
      scrapedReviews: await this.getAll('scraped_reviews')
    };
  }
  
  async importAll(data: any): Promise<void> {
    if (data.profile) await this.put('profile', data.profile);
    if (data.favorites) for (const f of data.favorites) await this.put('favorites', f);
    if (data.ratings) for (const r of data.ratings) await this.put('ratings', r);
    if (data.comments) for (const c of data.comments) await this.put('comments', c);
    if (data.collections) for (const c of data.collections) await this.put('collections', c);
    if (data.history) for (const h of data.history) await this.put('history', h);
    if (data.shoppingLists) for (const s of data.shoppingLists) await this.put('shopping_lists', s);
    if (data.scrapedPlaces) for (const p of data.scrapedPlaces) await this.put('scraped_places', p);
    if (data.scrapedReviews) for (const r of data.scrapedReviews) await this.put('scraped_reviews', r);
  }
}

// Export singleton instance
export const userDB = new GOSUserDatabase();
export default userDB;