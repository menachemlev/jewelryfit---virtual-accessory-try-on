// Serverless-compatible database service using in-memory storage
// WARNING: Data is lost on function restart. Use a cloud database for production!

const users = new Map();

export const serverlessDbService = {
  /**
   * Get or create a user by ID
   * If user doesn't exist, create with 5 initial credits
   */
  getOrCreateUser: (userId, userData = {}) => {
    try {
      let user = users.get(userId);
      
      if (!user) {
        user = {
          id: userId,
          email: userData.email || '',
          name: userData.name || 'User',
          provider: userData.provider || 'google',
          credits: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        users.set(userId, user);
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
      const user = users.get(userId);
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
      const user = users.get(userId);
      
      if (!user || user.credits < amount) {
        return false;
      }

      user.credits -= amount;
      user.updated_at = new Date().toISOString();
      users.set(userId, user);
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
      let user = users.get(userId);
      
      if (!user) {
        user = serverlessDbService.getOrCreateUser(userId);
      }
      
      user.credits += amount;
      user.updated_at = new Date().toISOString();
      users.set(userId, user);
      
      return user.credits;
    } catch (error) {
      console.error('Error in addCredits:', error);
      throw error;
    }
  },

  /**
   * Get user by ID
   */
  getUser: (userId) => {
    return users.get(userId) || null;
  },

  /**
   * Get all users (for admin purposes)
   */
  getAllUsers: () => {
    return users;
  },

  /**
   * Reset database (clear all users)
   */
  resetDatabase: () => {
    users.clear();
    return true;
  }
};

export default serverlessDbService;
