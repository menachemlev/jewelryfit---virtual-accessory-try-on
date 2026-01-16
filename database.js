import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
const db = new Database(path.join(__dirname, 'jewelryfit.db'));

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    provider TEXT,
    credits INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

export const dbService = {
  /**
   * Get or create a user by ID
   * If user doesn't exist, create with 5 initial credits
   */
  getOrCreateUser: (userId, userData = {}) => {
    try {
      // First try to get existing user
      let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      
      if (!user) {
        // Create new user with 5 initial credits
        const stmt = db.prepare(`
          INSERT INTO users (id, email, name, provider, credits)
          VALUES (?, ?, ?, ?, 5)
        `);
        
        stmt.run(
          userId,
          userData.email || '',
          userData.name || 'User',
          userData.provider || 'google'
        );
        
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      }
      
      return user;
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      throw error;
    }
  },

  /**
   * Get user credits by user ID
   */
  getUserCredits: (userId) => {
    try {
      const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId);
      return user ? user.credits : 0;
    } catch (error) {
      console.error('Error in getUserCredits:', error);
      throw error;
    }
  },

  /**
   * Deduct credits from a user
   * Returns true if successful, false if insufficient credits
   */
  deductCredits: (userId, amount = 1) => {
    try {
      const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId);
      
      if (!user || user.credits < amount) {
        return false;
      }

      const stmt = db.prepare(`
        UPDATE users 
        SET credits = credits - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(amount, userId);
      return true;
    } catch (error) {
      console.error('Error in deductCredits:', error);
      throw error;
    }
  },

  /**
   * Add credits to a user
   */
  addCredits: (userId, amount) => {
    try {
      const stmt = db.prepare(`
        UPDATE users 
        SET credits = credits + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      const result = stmt.run(amount, userId);
      
      if (result.changes === 0) {
        // User doesn't exist, create them first
        dbService.getOrCreateUser(userId);
        stmt.run(amount, userId);
      }
      
      return db.prepare('SELECT credits FROM users WHERE id = ?').get(userId).credits;
    } catch (error) {
      console.error('Error in addCredits:', error);
      throw error;
    }
  },

  /**
   * Update user information
   */
  updateUser: (userId, userData) => {
    try {
      const updates = [];
      const values = [];
      
      if (userData.email !== undefined) {
        updates.push('email = ?');
        values.push(userData.email);
      }
      if (userData.name !== undefined) {
        updates.push('name = ?');
        values.push(userData.name);
      }
      if (userData.provider !== undefined) {
        updates.push('provider = ?');
        values.push(userData.provider);
      }
      
      if (updates.length === 0) return;
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);
      
      const stmt = db.prepare(`
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = ?
      `);
      
      stmt.run(...values);
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  },

  /**
   * Delete a user
   */
  deleteUser: (userId) => {
    try {
      const stmt = db.prepare('DELETE FROM users WHERE id = ?');
      stmt.run(userId);
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  },

  /**
   * Close database connection
   */
  close: () => {
    db.close();
  }
};

export default dbService;
