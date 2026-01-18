"""
Serverless-compatible database service using in-memory storage
Python equivalent of serverless-db.js

WARNING: Data is lost on function restart. Use a cloud database for production!
For production, replace with:
- Firebase Firestore
- MongoDB Atlas
- PostgreSQL (Vercel Postgres)
- Supabase
"""

from datetime import datetime
from typing import Dict, Optional

# In-memory storage (equivalent to Map in JavaScript)
users: Dict[str, dict] = {}

class ServerlessDbService:
    """Database service for serverless functions"""
    
    @staticmethod
    def get_or_create_user(user_id: str, user_data: Optional[dict] = None) -> dict:
        """
        Get or create a user by ID
        If user doesn't exist, create with 5 initial credits
        
        Args:
            user_id: User's unique identifier
            user_data: Optional user data (email, name, provider)
            
        Returns:
            User dictionary with credits and metadata
        """
        try:
            if user_id not in users:
                user_data = user_data or {}
                users[user_id] = {
                    'id': user_id,
                    'email': user_data.get('email', ''),
                    'name': user_data.get('name', 'User'),
                    'provider': user_data.get('provider', 'google'),
                    'credits': 5,
                    'freeTriesUsed': 0,  # NEW: Track free watermarked trials
                    'isPremium': False,   # NEW: Premium status
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }
            
            return users[user_id]
        except Exception as e:
            print(f'Error in get_or_create_user: {e}')
            raise
    
    @staticmethod
    def get_user_credits(user_id: str) -> int:
        """
        Get user credits by user ID
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            Number of credits (0 if user doesn't exist)
        """
        try:
            user = users.get(user_id)
            return user['credits'] if user else 0
        except Exception as e:
            print(f'Error in get_user_credits: {e}')
            raise
    
    @staticmethod
    def deduct_credits(user_id: str, amount: int = 1) -> bool:
        """
        Deduct credits from a user
        
        Args:
            user_id: User's unique identifier
            amount: Number of credits to deduct (default: 1)
            
        Returns:
            True if successful, False if insufficient credits
        """
        try:
            user = users.get(user_id)
            
            if not user or user['credits'] < amount:
                return False
            
            user['credits'] -= amount
            user['updated_at'] = datetime.utcnow().isoformat()
            return True
        except Exception as e:
            print(f'Error in deduct_credits: {e}')
            raise
    
    @staticmethod
    def add_credits(user_id: str, amount: int) -> int:
        """
        Add credits to a user
        
        Args:
            user_id: User's unique identifier
            amount: Number of credits to add
            
        Returns:
            Updated credit balance
        """
        try:
            if user_id not in users:
                ServerlessDbService.get_or_create_user(user_id)
            
            users[user_id]['credits'] += amount
            users[user_id]['updated_at'] = datetime.utcnow().isoformat()
            
            return users[user_id]['credits']
        except Exception as e:
            print(f'Error in add_credits: {e}')
            raise
    
    @staticmethod
    def get_user(user_id: str) -> Optional[dict]:
        """
        Get user by ID
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            User dictionary or None if not found
        """
        return users.get(user_id)
    
    @staticmethod
    def increment_free_tries(user_id: str) -> bool:
        """
        Increment free trial counter for user
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            True if successful
        """
        try:
            if user_id not in users:
                ServerlessDbService.get_or_create_user(user_id)
            
            users[user_id]['freeTriesUsed'] = users[user_id].get('freeTriesUsed', 0) + 1
            users[user_id]['updated_at'] = datetime.utcnow().isoformat()
            return True
        except Exception as e:
            print(f'Error in increment_free_tries: {e}')
            raise
    
    @staticmethod
    def can_use_free_trials(user_id: str) -> bool:
        """
        Check if user can still use free trials
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            True if user has free trials remaining (max 2)
        """
        user = users.get(user_id)
        if not user:
            return True  # New users can use trials
        return user.get('freeTriesUsed', 0) < 2

# Export singleton instance
db_service = ServerlessDbService()
