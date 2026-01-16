import serverlessDbService from '../../serverless-db.js';
import { authenticateToken, setCorsHeaders, handleOptions } from '../_middleware.js';

/**
 * GET /api/users/:userId/credits
 * Get user's current credit balance
 */
export default async function handler(req, res) {
  setCorsHeaders(res);
  
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = authenticateToken(req);
    const { userId: requestedUserId } = req.query;
    
    // Verify the userId matches the authenticated user
    if (requestedUserId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to user data' });
    }

    const credits = serverlessDbService.getUserCredits(userId);
    res.json({ credits });
  } catch (error) {
    console.error('Error in get credits:', error);
    if (error.message === 'Access token required') {
      return res.status(401).json({ error: error.message });
    }
    if (error.message === 'Invalid or expired token') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to get credits' });
  }
}
