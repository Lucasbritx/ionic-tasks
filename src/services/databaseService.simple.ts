import { Capacitor } from '@capacitor/core';

export interface ITask {
  id?: number;
  text: string;
  image_filepath: string;
  image_webview_path?: string;
  created_at?: string;
}

class DatabaseService {
  private isWeb: boolean;
  private readonly storageKey = 'ionic-tasks';

  constructor() {
    this.isWeb = Capacitor.getPlatform() === 'web';
  }

  async initializeDatabase(): Promise<void> {
    try {
      if (this.isWeb) {
        if (typeof Storage === "undefined") {
          throw new Error('LocalStorage is not available');
        }
        console.log('Web storage initialized successfully');
      } else {
        console.log('Mobile storage initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing database:', error);
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

  async addTask(task: Omit<ITask, 'id' | 'created_at'>): Promise<number> {
    try {
      const tasks = this.getStoredTasks();
      const newTask: ITask = {
        ...task,
        id: this.generateId(),
        created_at: new Date().toISOString()
      };
      
      tasks.unshift(newTask);
      this.saveTasksToStorage(tasks);
      
      return newTask.id!;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  async getAllTasks(): Promise<ITask[]> {
    try {
      return this.getStoredTasks();
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw error;
    }
  }

  async deleteTask(id: number): Promise<void> {
    try {
      const tasks = this.getStoredTasks();
      const filteredTasks = tasks.filter(task => task.id !== id);
      this.saveTasksToStorage(filteredTasks);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async updateTask(id: number, updates: Partial<Omit<ITask, 'id' | 'created_at'>>): Promise<void> {
    try {
      const tasks = this.getStoredTasks();
      const taskIndex = tasks.findIndex(task => task.id === id);
      
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }
      
      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      this.saveTasksToStorage(tasks);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async closeDatabase(): Promise<void> {
    console.log('Database connection closed');
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
