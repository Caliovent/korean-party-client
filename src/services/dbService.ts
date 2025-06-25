import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SpellMasteryData } from '../types/game';

const DB_NAME = 'KoreanPartyDB';
const DB_VERSION = 1;
const REVIEW_ITEMS_STORE = 'reviewItems';
const SYNC_QUEUE_STORE = 'syncQueue';

export interface ReviewItemRecord extends SpellMasteryData {
  // IndexedDB ne gère pas bien les undefined, s'assurer que les champs optionnels ont une valeur ou sont omis
  timestamp: number; // Pourrait être utile pour le débogage ou la gestion du cache
}

export interface SyncQueueItem {
  id?: number; // Auto-incrementing primary key
  itemId: string;
  isCorrect: boolean;
  timestamp: number;
  userId: string; // Important pour s'assurer que la synchronisation se fait pour le bon utilisateur
}

interface KoreanPartyDBSchema extends DBSchema {
  [REVIEW_ITEMS_STORE]: {
    key: string; // spellId
    value: ReviewItemRecord;
  };
  [SYNC_QUEUE_STORE]: {
    key: number; // auto-incrementing id
    value: SyncQueueItem;
    indexes: { 'userId_timestamp': [string, number] }; // Pour récupérer par utilisateur et trier par temps
  };
}

let dbPromise: Promise<IDBPDatabase<KoreanPartyDBSchema>> | null = null;

const initDB = () => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB<KoreanPartyDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);
      if (!db.objectStoreNames.contains(REVIEW_ITEMS_STORE)) {
        db.createObjectStore(REVIEW_ITEMS_STORE, { keyPath: 'spellId' });
        console.log(`Object store ${REVIEW_ITEMS_STORE} created.`);
      }
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const store = db.createObjectStore(SYNC_QUEUE_STORE, { autoIncrement: true, keyPath: 'id' });
        store.createIndex('userId_timestamp', ['userId', 'timestamp']);
        console.log(`Object store ${SYNC_QUEUE_STORE} created with index 'userId_timestamp'.`);
      }
    },
  });
  return dbPromise;
};


// --- Review Items Store Functions ---

export const saveReviewItems = async (items: SpellMasteryData[], userId: string): Promise<void> => {
  if (!userId) {
    console.warn("User ID is missing, cannot save review items to user-specific storage yet. Storing globally for now.");
    // Alternative: store under a generic key or prevent storage
  }
  const db = await initDB();
  const tx = db.transaction(REVIEW_ITEMS_STORE, 'readwrite');
  const store = tx.objectStore(REVIEW_ITEMS_STORE);
  // Pour l'instant, on écrase tout. On pourrait affiner plus tard si besoin (ex: par utilisateur)
  // Si on veut stocker par utilisateur, il faudra un index sur userId ou un store par utilisateur.
  // Pour simplifier, on va considérer que les reviewItems sont pour l'utilisateur courant et on les écrase.
  await store.clear(); // Clear old items before saving new ones for the current user context
  const timestamp = Date.now();
  const operations = items.map(item => {
    return store.put({ ...item, timestamp });
  });
  await Promise.all(operations);
  await tx.done;
  console.log(`${items.length} review items saved to IndexedDB.`);
};

export const getStoredReviewItems = async (userId: string): Promise<SpellMasteryData[]> => {
  // Pour l'instant, on ne filtre pas par userId car on écrase tout.
  // Si on stockait par utilisateur, il faudrait modifier cette logique.
  if (!userId) {
    console.warn("User ID is missing, cannot fetch user-specific review items.");
    return [];
  }
  const db = await initDB();
  const items = await db.getAll(REVIEW_ITEMS_STORE);
  console.log(`Retrieved ${items.length} review items from IndexedDB.`);
  return items.map(item => {
    // Exclude timestamp
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { timestamp, ...rest } = item;
    return rest as SpellMasteryData;
  });
};


// --- Sync Queue Store Functions ---

export const addToSyncQueue = async (item: Omit<SyncQueueItem, 'id' | 'timestamp'>): Promise<void> => {
  const db = await initDB();
  const itemWithTimestamp: SyncQueueItem = { ...item, timestamp: Date.now() };
  await db.add(SYNC_QUEUE_STORE, itemWithTimestamp);
  console.log(`Item ${item.itemId} added to sync queue.`);
};

export const getSyncQueueItems = async (userId: string): Promise<SyncQueueItem[]> => {
  if (!userId) {
    console.warn("User ID is missing, cannot fetch sync queue items.");
    return [];
  }
  const db = await initDB();
  // Utilisation de l'index pour récupérer les items de l'utilisateur, triés par timestamp
  const items = await db.getAllFromIndex(SYNC_QUEUE_STORE, 'userId_timestamp', IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]));
  console.log(`Retrieved ${items.length} items from sync queue for user ${userId}.`);
  return items;
};

export const deleteFromSyncQueue = async (id: number): Promise<void> => {
  const db = await initDB();
  await db.delete(SYNC_QUEUE_STORE, id);
  console.log(`Item with id ${id} deleted from sync queue.`);
};

export const clearReviewItems = async (): Promise<void> => {
  const db = await initDB();
  await db.clear(REVIEW_ITEMS_STORE);
  console.log('Review items cleared from IndexedDB.');
};

export const clearSyncQueue = async (): Promise<void> => {
  const db = await initDB();
  await db.clear(SYNC_QUEUE_STORE);
  console.log('Sync queue cleared from IndexedDB.');
};

// Initialize the database when the module is loaded
initDB().then(() => {
  console.log("Database initialized successfully.");
}).catch(error => {
  console.error("Failed to initialize database:", error);
});
