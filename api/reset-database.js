import { serverlessDbService } from './serverless-db.js';

/**
 * Reset Database (Development Only)
 * WARNING: This will delete ALL user data
 * 
 * Note: In Vercel, this resets the in-memory database.
 * The database is automatically reset on each deployment anyway.
 */
export default async function handler(req, res) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Database reset is not allowed in production' 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Optional: Add a secret key for extra protection
    const { secret } = req.body;
    const RESET_SECRET = process.env.DB_RESET_SECRET || 'dev-reset-secret';
    
    if (secret !== RESET_SECRET) {
      return res.status(401).json({ 
        error: 'Invalid reset secret' 
      });
    }

    // Reset the in-memory database (clear all users)
    // Note: This only affects the current serverless function instance
    const usersMap = serverlessDbService.getAllUsers ? 
      serverlessDbService.getAllUsers() : new Map();
    
    usersMap.clear();

    res.status(200).json({ 
      success: true, 
      message: 'Database reset successfully. All user data has been cleared from this instance.',
      note: 'In Vercel serverless environment, each function instance has its own memory. The database resets automatically on deployment.'
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    res.status(500).json({ 
      error: 'Failed to reset database', 
      details: error.message 
    });
  }
}
