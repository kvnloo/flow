/**
 * IndexedDB wrapper for Flow session storage
 * Privacy-first local storage - no cloud sync
 */

// Database configuration
const DB_NAME = 'FlowSessionDB';
const DB_VERSION = 1;

// Object store names
const STORES = {
  SESSIONS: 'sessions',
  CALIBRATIONS: 'calibrations',
  EVENTS: 'events',
  METRICS: 'metrics'
} as const;

// Type definitions
export interface Session {
  id: string;
  userId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  flowScore?: number;
  meanFlowScore?: number;
  peakFlowScore?: number;
  totalInterruptions?: number;
  deepWorkMinutes?: number;
  tags?: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CalibrationData {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: number;
  baselineMetrics: {
    focusLevel: number;
    energyLevel: number;
    stressLevel: number;
    environmentalFactors: Record<string, any>;
  };
  personalFactors: {
    sleepQuality?: number;
    caffeineIntake?: number;
    exerciseToday?: boolean;
    moodRating?: number;
  };
  createdAt: number;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: 'interruption' | 'break' | 'state_change' | 'metric_update' | 'note';
  timestamp: number;
  data: Record<string, any>;
  createdAt: number;
}

export interface FlowMetric {
  id: string;
  sessionId: string;
  timestamp: number;
  flowScore: number;
  focusLevel: number;
  productivity: number;
  cognitiveLoad: number;
  arousal: number;
  valence: number;
  createdAt: number;
}

export interface SessionQuery {
  userId?: string;
  startDate?: number;
  endDate?: number;
  minFlowScore?: number;
  maxFlowScore?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface ExportData {
  sessions: Session[];
  calibrations: CalibrationData[];
  events: SessionEvent[];
  metrics: FlowMetric[];
  exportDate: number;
  version: number;
}

/**
 * IndexedDB Session Database Manager
 */
class SessionDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize the database with schema
   */
  async init(): Promise<IDBDatabase> {
    // Return existing connection if already initialized
    if (this.db) return this.db;

    // Return pending initialization if in progress
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.setupErrorHandler();
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createSchema(db, event.oldVersion);
      };
    });

    return this.initPromise;
  }

  /**
   * Create database schema and indexes
   */
  private createSchema(db: IDBDatabase, oldVersion: number): void {
    // Sessions store
    if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
      const sessionStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
      sessionStore.createIndex('userId', 'userId', { unique: false });
      sessionStore.createIndex('startTime', 'startTime', { unique: false });
      sessionStore.createIndex('flowScore', 'flowScore', { unique: false });
      sessionStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      sessionStore.createIndex('userId_startTime', ['userId', 'startTime'], { unique: false });
    }

    // Calibrations store
    if (!db.objectStoreNames.contains(STORES.CALIBRATIONS)) {
      const calibrationStore = db.createObjectStore(STORES.CALIBRATIONS, { keyPath: 'id' });
      calibrationStore.createIndex('sessionId', 'sessionId', { unique: false });
      calibrationStore.createIndex('userId', 'userId', { unique: false });
      calibrationStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // Events store
    if (!db.objectStoreNames.contains(STORES.EVENTS)) {
      const eventStore = db.createObjectStore(STORES.EVENTS, { keyPath: 'id' });
      eventStore.createIndex('sessionId', 'sessionId', { unique: false });
      eventStore.createIndex('type', 'type', { unique: false });
      eventStore.createIndex('timestamp', 'timestamp', { unique: false });
      eventStore.createIndex('sessionId_timestamp', ['sessionId', 'timestamp'], { unique: false });
    }

    // Metrics store
    if (!db.objectStoreNames.contains(STORES.METRICS)) {
      const metricStore = db.createObjectStore(STORES.METRICS, { keyPath: 'id' });
      metricStore.createIndex('sessionId', 'sessionId', { unique: false });
      metricStore.createIndex('timestamp', 'timestamp', { unique: false });
      metricStore.createIndex('flowScore', 'flowScore', { unique: false });
      metricStore.createIndex('sessionId_timestamp', ['sessionId', 'timestamp'], { unique: false });
    }
  }

  /**
   * Setup global error handler
   */
  private setupErrorHandler(): void {
    if (this.db) {
      this.db.onerror = (event) => {
        console.error('Database error:', event);
      };
    }
  }

  /**
   * Execute a transaction with error handling
   */
  private async transaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    callback: (stores: IDBObjectStore | IDBObjectStore[]) => IDBRequest | Promise<T>
  ): Promise<T> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeNames, mode);
        const stores = Array.isArray(storeNames)
          ? storeNames.map(name => tx.objectStore(name))
          : tx.objectStore(storeNames);

        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));

        const result = callback(stores);

        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result);
          result.onerror = () => reject(result.error);
        } else {
          result.then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // ==================== Session Operations ====================

  /**
   * Create a new session
   */
  async createSession(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session> {
    const newSession: Session = {
      ...session,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.transaction(STORES.SESSIONS, 'readwrite', (store) => {
      return (store as IDBObjectStore).add(newSession);
    });

    return newSession;
  }

  /**
   * Get session by ID
   */
  async getSession(id: string): Promise<Session | null> {
    return this.transaction(STORES.SESSIONS, 'readonly', (store) => {
      return (store as IDBObjectStore).get(id);
    }).catch(() => null);
  }

  /**
   * Update session
   */
  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    return this.transaction(STORES.SESSIONS, 'readwrite', async (store) => {
      const objectStore = store as IDBObjectStore;
      const session = await new Promise<Session>((resolve, reject) => {
        const request = objectStore.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!session) {
        throw new Error(`Session ${id} not found`);
      }

      const updated: Session = {
        ...session,
        ...updates,
        id, // Prevent ID changes
        updatedAt: Date.now()
      };

      return new Promise((resolve, reject) => {
        const request = objectStore.put(updated);
        request.onsuccess = () => resolve(updated);
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Delete session
   */
  async deleteSession(id: string): Promise<void> {
    await this.transaction(STORES.SESSIONS, 'readwrite', (store) => {
      return (store as IDBObjectStore).delete(id);
    });
  }

  /**
   * Query sessions with filters
   */
  async querySessions(query: SessionQuery = {}): Promise<Session[]> {
    return this.transaction(STORES.SESSIONS, 'readonly', async (store) => {
      const objectStore = store as IDBObjectStore;
      let cursor: IDBRequest<IDBCursorWithValue | null>;

      // Use appropriate index based on query
      if (query.userId && query.startDate) {
        const index = objectStore.index('userId_startTime');
        const range = IDBKeyRange.bound(
          [query.userId, query.startDate || 0],
          [query.userId, query.endDate || Date.now()]
        );
        cursor = index.openCursor(range);
      } else if (query.userId) {
        const index = objectStore.index('userId');
        cursor = index.openCursor(IDBKeyRange.only(query.userId));
      } else if (query.startDate || query.endDate) {
        const index = objectStore.index('startTime');
        const range = IDBKeyRange.bound(
          query.startDate || 0,
          query.endDate || Date.now()
        );
        cursor = index.openCursor(range);
      } else {
        cursor = objectStore.openCursor();
      }

      return new Promise((resolve, reject) => {
        const results: Session[] = [];
        let count = 0;

        cursor.onsuccess = (event) => {
          const cursorResult = (event.target as IDBRequest<IDBCursorWithValue | null>).result;

          if (cursorResult) {
            const session = cursorResult.value as Session;

            // Apply additional filters
            if (this.matchesQuery(session, query)) {
              if (!query.offset || count >= query.offset) {
                results.push(session);
              }
              count++;
            }

            // Check limit
            if (query.limit && results.length >= query.limit) {
              resolve(results);
              return;
            }

            cursorResult.continue();
          } else {
            resolve(results);
          }
        };

        cursor.onerror = () => reject(cursor.error);
      });
    });
  }

  /**
   * Check if session matches query filters
   */
  private matchesQuery(session: Session, query: SessionQuery): boolean {
    if (query.minFlowScore !== undefined && (session.flowScore || 0) < query.minFlowScore) {
      return false;
    }
    if (query.maxFlowScore !== undefined && (session.flowScore || 0) > query.maxFlowScore) {
      return false;
    }
    if (query.tags && query.tags.length > 0) {
      const sessionTags = session.tags || [];
      if (!query.tags.some(tag => sessionTags.includes(tag))) {
        return false;
      }
    }
    return true;
  }

  // ==================== Calibration Operations ====================

  /**
   * Create calibration data
   */
  async createCalibration(calibration: Omit<CalibrationData, 'id' | 'createdAt'>): Promise<CalibrationData> {
    const newCalibration: CalibrationData = {
      ...calibration,
      id: this.generateId(),
      createdAt: Date.now()
    };

    await this.transaction(STORES.CALIBRATIONS, 'readwrite', (store) => {
      return (store as IDBObjectStore).add(newCalibration);
    });

    return newCalibration;
  }

  /**
   * Get calibrations for session
   */
  async getSessionCalibrations(sessionId: string): Promise<CalibrationData[]> {
    return this.transaction(STORES.CALIBRATIONS, 'readonly', async (store) => {
      const index = (store as IDBObjectStore).index('sessionId');
      const request = index.getAll(IDBKeyRange.only(sessionId));

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // ==================== Event Operations ====================

  /**
   * Create session event
   */
  async createEvent(event: Omit<SessionEvent, 'id' | 'createdAt'>): Promise<SessionEvent> {
    const newEvent: SessionEvent = {
      ...event,
      id: this.generateId(),
      createdAt: Date.now()
    };

    await this.transaction(STORES.EVENTS, 'readwrite', (store) => {
      return (store as IDBObjectStore).add(newEvent);
    });

    return newEvent;
  }

  /**
   * Get events for session
   */
  async getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
    return this.transaction(STORES.EVENTS, 'readonly', async (store) => {
      const index = (store as IDBObjectStore).index('sessionId_timestamp');
      const range = IDBKeyRange.bound([sessionId, 0], [sessionId, Date.now()]);
      const request = index.getAll(range);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // ==================== Metrics Operations ====================

  /**
   * Create flow metric
   */
  async createMetric(metric: Omit<FlowMetric, 'id' | 'createdAt'>): Promise<FlowMetric> {
    const newMetric: FlowMetric = {
      ...metric,
      id: this.generateId(),
      createdAt: Date.now()
    };

    await this.transaction(STORES.METRICS, 'readwrite', (store) => {
      return (store as IDBObjectStore).add(newMetric);
    });

    return newMetric;
  }

  /**
   * Get metrics for session
   */
  async getSessionMetrics(sessionId: string): Promise<FlowMetric[]> {
    return this.transaction(STORES.METRICS, 'readonly', async (store) => {
      const index = (store as IDBObjectStore).index('sessionId_timestamp');
      const range = IDBKeyRange.bound([sessionId, 0], [sessionId, Date.now()]);
      const request = index.getAll(range);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // ==================== Export Operations ====================

  /**
   * Export all session data for analysis
   */
  async exportData(userId?: string): Promise<ExportData> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SESSIONS, STORES.CALIBRATIONS, STORES.EVENTS, STORES.METRICS], 'readonly');
      const results: Partial<ExportData> = {};

      const exportStore = async (storeName: string, key: keyof ExportData) => {
        return new Promise<any[]>((resolveStore, rejectStore) => {
          const store = tx.objectStore(storeName);
          const request = userId && storeName === STORES.SESSIONS
            ? store.index('userId').getAll(IDBKeyRange.only(userId))
            : store.getAll();

          request.onsuccess = () => resolveStore(request.result);
          request.onerror = () => rejectStore(request.error);
        });
      };

      Promise.all([
        exportStore(STORES.SESSIONS, 'sessions'),
        exportStore(STORES.CALIBRATIONS, 'calibrations'),
        exportStore(STORES.EVENTS, 'events'),
        exportStore(STORES.METRICS, 'metrics')
      ]).then(([sessions, calibrations, events, metrics]) => {
        // Filter related data if userId specified
        let filteredSessions = sessions;
        let filteredCalibrations = calibrations;
        let filteredEvents = events;
        let filteredMetrics = metrics;

        if (userId) {
          const sessionIds = new Set(sessions.map((s: Session) => s.id));
          filteredCalibrations = calibrations.filter((c: CalibrationData) => sessionIds.has(c.sessionId));
          filteredEvents = events.filter((e: SessionEvent) => sessionIds.has(e.sessionId));
          filteredMetrics = metrics.filter((m: FlowMetric) => sessionIds.has(m.sessionId));
        }

        resolve({
          sessions: filteredSessions,
          calibrations: filteredCalibrations,
          events: filteredEvents,
          metrics: filteredMetrics,
          exportDate: Date.now(),
          version: DB_VERSION
        });
      }).catch(reject);

      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Import session data (for backup restoration)
   */
  async importData(data: ExportData): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SESSIONS, STORES.CALIBRATIONS, STORES.EVENTS, STORES.METRICS], 'readwrite');

      try {
        const sessionStore = tx.objectStore(STORES.SESSIONS);
        const calibrationStore = tx.objectStore(STORES.CALIBRATIONS);
        const eventStore = tx.objectStore(STORES.EVENTS);
        const metricStore = tx.objectStore(STORES.METRICS);

        data.sessions.forEach(session => sessionStore.put(session));
        data.calibrations.forEach(calibration => calibrationStore.put(calibration));
        data.events.forEach(event => eventStore.put(event));
        data.metrics.forEach(metric => metricStore.put(metric));

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Import transaction aborted'));
      } catch (error) {
        reject(error);
      }
    });
  }

  // ==================== Utility Operations ====================

  /**
   * Clear all data (for testing or reset)
   */
  async clearAll(): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SESSIONS, STORES.CALIBRATIONS, STORES.EVENTS, STORES.METRICS], 'readwrite');

      tx.objectStore(STORES.SESSIONS).clear();
      tx.objectStore(STORES.CALIBRATIONS).clear();
      tx.objectStore(STORES.EVENTS).clear();
      tx.objectStore(STORES.METRICS).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    sessions: number;
    calibrations: number;
    events: number;
    metrics: number;
  }> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SESSIONS, STORES.CALIBRATIONS, STORES.EVENTS, STORES.METRICS], 'readonly');
      const stats = { sessions: 0, calibrations: 0, events: 0, metrics: 0 };

      const countStore = (storeName: string, key: keyof typeof stats) => {
        return new Promise<void>((resolveCount) => {
          const request = tx.objectStore(storeName).count();
          request.onsuccess = () => {
            stats[key] = request.result;
            resolveCount();
          };
        });
      };

      Promise.all([
        countStore(STORES.SESSIONS, 'sessions'),
        countStore(STORES.CALIBRATIONS, 'calibrations'),
        countStore(STORES.EVENTS, 'events'),
        countStore(STORES.METRICS, 'metrics')
      ]).then(() => resolve(stats)).catch(reject);

      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Singleton instance
export const sessionDB = new SessionDatabase();

// Export for testing
export { SessionDatabase };
