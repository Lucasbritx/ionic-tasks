import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

export interface ITask {
  id?: number;
  text: string;
  image_filepath: string;
  image_webview_path?: string;
  created_at?: string;
}

class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private readonly dbName = 'tasks.db';
  private isWeb: boolean;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.isWeb = Capacitor.getPlatform() === 'web';
  }

  async initializeDatabase(): Promise<void> {
    try {
      if (this.isWeb) {
        await this.initializeWebStore();
      }

      const ret = await CapacitorSQLite.checkConnectionsConsistency({
        dbNames: [this.dbName],
      });

      const isConsistent = ret.result;
      if (!isConsistent) {
        await this.sqlite.closeAllConnections();
      }

      this.db = await this.sqlite.createConnection(
        this.dbName,
        false,
        'no-encryption',
        1,
        false
      );

      await this.db.open();

      await this.createTables();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async initializeWebStore(): Promise<void> {
    try {
      await CapacitorSQLite.initWebStore();
      console.log('Web store initialized');
    } catch (error) {
      console.error('Error initializing web store:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createTasksTable = `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        image_filepath TEXT,
        image_webview_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await this.db.execute(createTasksTable);
      console.log('Tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  async addTask(task: Omit<ITask, 'id' | 'created_at'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT INTO tasks (text, image_filepath, image_webview_path) 
      VALUES (?, ?, ?)
    `;

    try {
      const result = await this.db.run(query, [
        task.text,
        task.image_filepath,
        task.image_webview_path || null
      ]);

      return result.changes?.lastId || 0;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  async getAllTasks(): Promise<ITask[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT id, text, image_filepath, image_webview_path, created_at 
      FROM tasks 
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.db.query(query);
      return result.values || [];
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw error;
    }
  }

  async deleteTask(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `DELETE FROM tasks WHERE id = ?`;

    try {
      await this.db.run(query, [id]);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async updateTask(id: number, task: Partial<Omit<ITask, 'id' | 'created_at'>>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (task.text !== undefined) {
      fields.push('text = ?');
      values.push(task.text);
    }
    if (task.image_filepath !== undefined) {
      fields.push('image_filepath = ?');
      values.push(task.image_filepath);
    }
    if (task.image_webview_path !== undefined) {
      fields.push('image_webview_path = ?');
      values.push(task.image_webview_path);
    }

    if (fields.length === 0) return;

    values.push(id);
    const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;

    try {
      await this.db.run(query, values);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async closeDatabase(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
        this.db = null;
        console.log('Database closed successfully');
      } catch (error) {
        console.error('Error closing database:', error);
      }
    }
  }
}

export const databaseService = new DatabaseService();
