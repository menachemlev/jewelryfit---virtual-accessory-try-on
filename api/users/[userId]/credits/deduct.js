import serverlessDbService from '../../../serverless-db.js';
import { authenticateToken, setCorsHeaders, handleOptions } from '../../_middleware.js';

/**
 * POST /api/users/:userId/credits/deduct
 * Deduct credits from user
 */
export default async function handler(req, res) {
  setCorsHeaders(res);
  
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = authenticateToken(req);
    const { userId: requestedUserId } = req.query;
    const { amount = 1 } = req.body;
    
    // Verify the userId matches the authenticated user
    if (requestedUserId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to user data' });
    }

    // Check if user has unlimited credits
    const unlimited_credits_users = process.env.UNLIMITED_CREDITS_USERS_LIST?.split(',').map(id => id.trim()) || [];
    const isUnlimited = unlimited_credits_users.includes(userId);
    
    if (isUnlimited) {
      // Don't deduct credits for unlimited users, just return current credits
      const currentCredits = serverlessDbService.getUserCredits(userId);
      return res.json({ success: true, credits: currentCredits > 0 ? currentCredits : 1000 });
    }
    
    const success = serverlessDbService.deductCredits(userId, amount);
    
    if (!success) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    const newCredits = serverlessDbService.getUserCredits(userId);
    res.json({ success: true, credits: newCredits });
  } catch (error) {
    console.error('Error in deduct credits:', error);
    if (error.message === 'Access token required') {
      return res.status(401).json({ error: error.message });
    }
    if (error.message === 'Invalid or expired token') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to deduct credits' });
  }
}
