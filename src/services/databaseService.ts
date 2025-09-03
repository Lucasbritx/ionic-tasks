import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

export interface ITask {
  id?: number;
  text: string;
  image_filepath: string;
  image_webview_path?: string;
  image_base64?: string;
  completed: boolean;
  created_at?: string;
}

class DatabaseService {
  private isWeb: boolean;
  private readonly storageKey = 'ionic-tasks';
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private readonly dbName = 'tasks.db';

  constructor() {
    this.isWeb = Capacitor.getPlatform() === 'web';
    if (!this.isWeb) {
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
    }
  }

  async initializeDatabase(): Promise<void> {
    try {
      if (this.isWeb) {
        if (typeof Storage === "undefined") {
          throw new Error('LocalStorage is not available');
        }
        console.log('Web storage initialized successfully');
      } else {
        if (!this.sqlite) {
          throw new Error('SQLite not initialized');
        }

        this.db = await this.sqlite.createConnection(
          this.dbName,
          false,
          'no-encryption',
          1,
          false
        );

        await this.db.open();

        await this.createSQLiteTables();
        
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async createSQLiteTables(): Promise<void> {
    if (!this.db) throw new Error('SQLite database not initialized');

    const createTasksTable = `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        image_filepath TEXT,
        image_webview_path TEXT,
        image_base64 TEXT,
        completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await this.db.execute(createTasksTable);
      console.log('SQLite tables created successfully');
    } catch (error) {
      console.error('Error creating SQLite tables:', error);
      throw error;
    }
  }

  private getStoredTasks(): ITask[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading stored tasks:', error);
      return [];
    }
  }

  private saveTasksToStorage(tasks: ITask[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks to storage:', error);
      throw error;
    }
  }

  private generateId(): number {
    return Date.now() + Math.random();
  }

  async convertImageToBase64(imagePath: string): Promise<string> {
    try {
      if (!imagePath) return '';
      
      if (imagePath.startsWith('data:')) {
        return imagePath;
      }
      
      const response = await fetch(imagePath);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return '';
    }
  }

  async addTask(task: Omit<ITask, 'id' | 'created_at'>): Promise<number> {
    try {
      if (this.isWeb) {
        const tasks = this.getStoredTasks();
        
        let image_base64 = '';
        if (task.image_webview_path) {
          image_base64 = await this.convertImageToBase64(task.image_webview_path);
        }
        
        const newTask: ITask = {
          ...task,
          id: this.generateId(),
          created_at: new Date().toISOString(),
          completed: false,
          image_base64: image_base64
        };
        
        tasks.unshift(newTask);
        this.saveTasksToStorage(tasks);
        
        return newTask.id!;
      } else {
        if (!this.db) throw new Error('SQLite database not initialized');

        const query = `
          INSERT INTO tasks (text, image_filepath, image_webview_path, image_base64, completed) 
          VALUES (?, ?, ?, ?, ?)
        `;

        const result = await this.db.run(query, [
          task.text,
          task.image_filepath,
          task.image_webview_path || '',
          task.image_base64 || '',
          0
        ]);

        return result.changes?.lastId || 0;
      }
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  async getAllTasks(): Promise<ITask[]> {
    try {
      if (this.isWeb) {
        const tasks = this.getStoredTasks();
        return tasks.map(task => ({
          ...task,
          image_webview_path: task.image_base64 || task.image_webview_path
        }));
      } else {
        if (!this.db) throw new Error('SQLite database not initialized');

        const query = `
          SELECT id, text, image_filepath, image_webview_path, image_base64, completed, created_at 
          FROM tasks 
          ORDER BY created_at DESC
        `;

        const result = await this.db.query(query);
        return (result.values || []).map((row: any) => ({
          id: row.id,
          text: row.text,
          image_filepath: row.image_filepath,
          image_webview_path: row.image_webview_path,
          image_base64: row.image_base64,
          completed: Boolean(row.completed),
          created_at: row.created_at
        }));
      }
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw error;
    }
  }

  async deleteTask(id: number): Promise<void> {
    try {
      if (this.isWeb) {
        const tasks = this.getStoredTasks();
        const filteredTasks = tasks.filter(task => task.id !== id);
        this.saveTasksToStorage(filteredTasks);
      } else {
        if (!this.db) throw new Error('SQLite database not initialized');

        const query = `DELETE FROM tasks WHERE id = ?`;
        await this.db.run(query, [id]);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async updateTask(id: number, updates: Partial<Omit<ITask, 'id' | 'created_at'>>): Promise<void> {
    try {
      if (this.isWeb) {
        const tasks = this.getStoredTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);
        
        if (taskIndex === -1) {
          throw new Error('Task not found');
        }
        
        tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
        this.saveTasksToStorage(tasks);
      } else {
        if (!this.db) throw new Error('SQLite database not initialized');

        const fields: string[] = [];
        const values: any[] = [];

        if (updates.text !== undefined) {
          fields.push('text = ?');
          values.push(updates.text);
        }
        if (updates.image_filepath !== undefined) {
          fields.push('image_filepath = ?');
          values.push(updates.image_filepath);
        }
        if (updates.image_webview_path !== undefined) {
          fields.push('image_webview_path = ?');
          values.push(updates.image_webview_path);
        }
        if (updates.completed !== undefined) {
          fields.push('completed = ?');
          values.push(updates.completed ? 1 : 0);
        }

        if (fields.length === 0) return;

        values.push(id);
        const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
        await this.db.run(query, values);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async toggleTaskCompletion(id: number): Promise<void> {
    try {
      if (this.isWeb) {
        const tasks = this.getStoredTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);
        
        if (taskIndex === -1) {
          throw new Error('Task not found');
        }
        
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        this.saveTasksToStorage(tasks);
      } else {
        if (!this.db) throw new Error('SQLite database not initialized');

        const query = `UPDATE tasks SET completed = NOT completed WHERE id = ?`;
        await this.db.run(query, [id]);
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
      throw error;
    }
  }

  async closeDatabase(): Promise<void> {
    if (!this.isWeb && this.db) {
      try {
        await this.db.close();
        this.db = null;
        console.log('SQLite database connection closed');
      } catch (error) {
        console.error('Error closing SQLite database:', error);
      }
    } else {
      console.log('Database connection closed');
    }
  }

  async clearAllTasks(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
      console.log('All tasks cleared');
    } catch (error) {
      console.error('Error clearing tasks:', error);
      throw error;
    }
  }
}

export const databaseService = new DatabaseService();
