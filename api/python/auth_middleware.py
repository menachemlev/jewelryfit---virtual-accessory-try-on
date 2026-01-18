"""
Authentication middleware for Python serverless functions
Python equivalent of _middleware.js

Provides JWT authentication and CORS handling
"""

import jwt
import os
from functools import wraps
from typing import Callable, Optional
from flask import Request, Response, jsonify

# JWT Secret from environment
JWT_SECRET = os.getenv('JWT_SECRET', 'default_secret_change_in_production')
CLIENT_URL = os.getenv('CLIENT_URL', '*')

class AuthenticationError(Exception):
    """Custom exception for authentication errors"""
    pass

def authenticate_token(request: Request) -> str:
    """
    Authenticate JWT token from request headers
    Python equivalent of authenticateToken in JavaScript
    
    Args:
        request: Flask/HTTP request object
        
    Returns:
        user_id extracted from token
        
    Raises:
        AuthenticationError: If token is missing or invalid
    """
    auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
    
    if not auth_header:
        raise AuthenticationError('Access token required')
    
    # Extract token from "Bearer TOKEN" format
    parts = auth_header.split(' ')
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        raise AuthenticationError('Invalid authorization header format')
    
    token = parts[1]
    
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return decoded['userId']
    except jwt.ExpiredSignatureError:
        raise AuthenticationError('Token has expired')
    except jwt.InvalidTokenError:
        raise AuthenticationError('Invalid or expired token')

def set_cors_headers(response: Response) -> Response:
    """
    Set CORS headers on response
    Python equivalent of setCorsHeaders in JavaScript
    
    Args:
        response: Flask response object
        
    Returns:
        Response with CORS headers set
    """
    response.headers['Access-Control-Allow-Origin'] = CLIENT_URL
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

def handle_cors_preflight(request: Request) -> Optional[Response]:
    """
    Handle OPTIONS preflight requests
    Python equivalent of handleOptions in JavaScript
    
    Args:
        request: Flask/HTTP request object
        
    Returns:
        Response for OPTIONS request, or None if not OPTIONS
    """
    if request.method == 'OPTIONS':
        response = Response('', 200)
        return set_cors_headers(response)
    return None

def require_auth(f: Callable) -> Callable:
    """
    Decorator to require authentication on Flask routes
    
    Usage:
        @require_auth
        def my_handler(request, user_id):
            # user_id is automatically extracted from JWT
            pass
    
    Args:
        f: Function to decorate
        
    Returns:
        Wrapped function with authentication
    """
    @wraps(f)
    def decorated_function(request: Request, *args, **kwargs):
        # Handle CORS preflight
        preflight = handle_cors_preflight(request)
        if preflight:
            return preflight
        
        try:
            user_id = authenticate_token(request)
            # Pass user_id to the handler
            response = f(request, user_id, *args, **kwargs)
            return set_cors_headers(response)
        except AuthenticationError as e:
            response = jsonify({'error': str(e)})
            response.status_code = 401 if 'required' in str(e) else 403
            return set_cors_headers(response)
        except Exception as e:
            response = jsonify({'error': 'Internal server error'})
            response.status_code = 500
            return set_cors_headers(response)
    
    return decorated_function

def verify_user_ownership(user_id: str, requested_user_id: str) -> bool:
    """
    Verify that the authenticated user matches the requested user
    
    Args:
        user_id: Authenticated user ID from token
        requested_user_id: User ID from request path/params
        
    Returns:
        True if user IDs match
        
    Raises:
        AuthenticationError: If user IDs don't match
    """
    if user_id != requested_user_id:
        raise AuthenticationError('Unauthorized access to user data')
    return True

def get_unlimited_credits_users() -> list:
    """
    Get list of users with unlimited credits
    
    Returns:
        List of user IDs
    """
    users_list = os.getenv('UNLIMITED_CREDITS_USERS_LIST', '')
    return [u.strip() for u in users_list.split(',') if u.strip()]

def apply_unlimited_credits(user_id: str, credits: int) -> int:
    """
    Apply unlimited credits check
    
    Args:
        user_id: User's unique identifier
        credits: Current credit count
        
    Returns:
        1000 if user has unlimited credits, otherwise original credits
    """
    unlimited_users = get_unlimited_credits_users()
    return 1000 if user_id in unlimited_users else credits
