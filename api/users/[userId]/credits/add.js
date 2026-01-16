import dbService from '../../../../database.js';
import { authenticateToken, setCorsHeaders, handleOptions } from '../../_middleware.js';

/**
 * POST /api/users/:userId/credits/add
 * Add credits to user
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
    const { amount } = req.body;
    
    // Verify the userId matches the authenticated user
    if (requestedUserId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to user data' });
    }
    
    if (!amount) {
      return res.status(400).json({ error: 'amount is required' });
    }

    const newCredits = dbService.addCredits(userId, amount);
    res.json({ success: true, credits: newCredits });
  } catch (error) {
    console.error('Error in add credits:', error);
    if (error.message === 'Access token required') {
      return res.status(401).json({ error: error.message });
    }
    if (error.message === 'Invalid or expired token') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to add credits' });
  }
}
