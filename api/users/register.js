import jwt from 'jsonwebtoken';
import dbService from '../../database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

// JWT Token Generation
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * POST /api/users/register
 * Create or get user and return with credits and JWT token
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, name, provider } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = dbService.getOrCreateUser(userId, { email, name, provider });
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    res.json({ 
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      credits: user.credits,
      token
    });
  } catch (error) {
    console.error('Error in /api/users/register:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
}
