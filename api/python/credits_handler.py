"""
Credit management endpoints for Python serverless functions
Python equivalent of credits.js and credits/add.js, credits/deduct.js

Handles:
- GET /api/users/:userId/credits - Get user credits
- POST /api/users/:userId/credits/add - Add credits
- POST /api/users/:userId/credits/deduct - Deduct credits
"""

from flask import Request
from .db_service import db_service
from .auth_middleware import (
    authenticate_token, 
    set_cors_headers, 
    handle_cors_preflight,
    verify_user_ownership,
    apply_unlimited_credits,
    AuthenticationError
)
from .utils import json_response, error_response, parse_json_body, log_request

def get_credits_handler(request: Request, user_id_param: str):
    """
    GET /api/users/:userId/credits
    Get user's current credit balance
    
    Args:
        request: Flask request object
        user_id_param: User ID from URL path
        
    Returns:
        JSON response with credits
    """
    # Handle CORS preflight
    preflight = handle_cors_preflight(request)
    if preflight:
        return set_cors_headers(preflight)
    
    if request.method != 'GET':
        return set_cors_headers(error_response('Method not allowed', 405))
    
    try:
        # Authenticate and get user ID from token
        user_id = authenticate_token(request)
        
        # Verify user owns this data
        verify_user_ownership(user_id, user_id_param)
        
        # Get credits
        credits = db_service.get_user_credits(user_id)
        
        # Apply unlimited credits check
        credits = apply_unlimited_credits(user_id, credits)
        
        log_request(request, f'User {user_id} has {credits} credits')
        
        return set_cors_headers(json_response({'credits': credits}))
        
    except AuthenticationError as e:
        status = 401 if 'required' in str(e) else 403
        return set_cors_headers(error_response(str(e), status))
    except Exception as e:
        print(f'Error in get_credits: {e}')
        return set_cors_headers(error_response(str(e), 500))

def add_credits_handler(request: Request, user_id_param: str):
    """
    POST /api/users/:userId/credits/add
    Add credits to a user (after payment)
    
    Body: { "amount": number }
    
    Args:
        request: Flask request object
        user_id_param: User ID from URL path
        
    Returns:
        JSON response with updated credits
    """
    # Handle CORS preflight
    preflight = handle_cors_preflight(request)
    if preflight:
        return set_cors_headers(preflight)
    
    if request.method != 'POST':
        return set_cors_headers(error_response('Method not allowed', 405))
    
    try:
        # Authenticate and get user ID from token
        user_id = authenticate_token(request)
        
        # Verify user owns this data
        verify_user_ownership(user_id, user_id_param)
        
        # Parse request body
        data = parse_json_body(request)
        amount = data.get('amount')
        
        if not amount or not isinstance(amount, (int, float)) or amount <= 0:
            return set_cors_headers(error_response('Invalid amount. Must be a positive number', 400))
        
        # Add credits
        new_credits = db_service.add_credits(user_id, int(amount))
        
        log_request(request, f'Added {amount} credits to user {user_id}. New balance: {new_credits}')
        
        return set_cors_headers(json_response({
            'success': True,
            'credits': new_credits,
            'message': f'Added {amount} credits successfully'
        }))
        
    except AuthenticationError as e:
        status = 401 if 'required' in str(e) else 403
        return set_cors_headers(error_response(str(e), status))
    except ValueError as e:
        return set_cors_headers(error_response(str(e), 400))
    except Exception as e:
        print(f'Error in add_credits: {e}')
        return set_cors_headers(error_response(str(e), 500))

def deduct_credits_handler(request: Request, user_id_param: str):
    """
    POST /api/users/:userId/credits/deduct
    Deduct credits from a user (for image generation)
    
    Body: { "amount": number } (default: 1)
    
    Args:
        request: Flask request object
        user_id_param: User ID from URL path
        
    Returns:
        JSON response with updated credits
    """
    # Handle CORS preflight
    preflight = handle_cors_preflight(request)
    if preflight:
        return set_cors_headers(preflight)
    
    if request.method != 'POST':
        return set_cors_headers(error_response('Method not allowed', 405))
    
    try:
        # Authenticate and get user ID from token
        user_id = authenticate_token(request)
        
        # Verify user owns this data
        verify_user_ownership(user_id, user_id_param)
        
        # Parse request body
        data = parse_json_body(request)
        amount = data.get('amount', 1)
        
        if not isinstance(amount, (int, float)) or amount <= 0:
            return set_cors_headers(error_response('Invalid amount. Must be a positive number', 400))
        
        # Deduct credits
        success = db_service.deduct_credits(user_id, int(amount))
        
        if not success:
            log_request(request, f'Insufficient credits for user {user_id}')
            return set_cors_headers(error_response('Insufficient credits', 402))
        
        # Get updated balance
        new_credits = db_service.get_user_credits(user_id)
        
        log_request(request, f'Deducted {amount} credits from user {user_id}. New balance: {new_credits}')
        
        return set_cors_headers(json_response({
            'success': True,
            'credits': new_credits,
            'message': f'Deducted {amount} credit(s) successfully'
        }))
        
    except AuthenticationError as e:
        status = 401 if 'required' in str(e) else 403
        return set_cors_headers(error_response(str(e), status))
    except ValueError as e:
        return set_cors_headers(error_response(str(e), 400))
    except Exception as e:
        print(f'Error in deduct_credits: {e}')
        return set_cors_headers(error_response(str(e), 500))

def free_tries_handler(request: Request, user_id_param: str):
    """
    POST /api/users/:userId/free-tries
    Increment free trial counter
    
    Args:
        request: Flask request object
        user_id_param: User ID from URL path
        
    Returns:
        JSON response with success status
    """
    # Handle CORS preflight
    preflight = handle_cors_preflight(request)
    if preflight:
        return set_cors_headers(preflight)
    
    if request.method != 'POST':
        return set_cors_headers(error_response('Method not allowed', 405))
    
    try:
        # Authenticate and get user ID from token
        user_id = authenticate_token(request)
        
        # Verify user owns this data
        verify_user_ownership(user_id, user_id_param)
        
        # Increment free tries
        db_service.increment_free_tries(user_id)
        
        # Get user to return updated data
        user = db_service.get_user(user_id)
        free_tries_used = user.get('freeTriesUsed', 0) if user else 0
        
        log_request(request, f'Incremented free tries for user {user_id}. Total: {free_tries_used}')
        
        return set_cors_headers(json_response({
            'success': True,
            'freeTriesUsed': free_tries_used,
            'remaining': max(0, 2 - free_tries_used)
        }))
        
    except AuthenticationError as e:
        status = 401 if 'required' in str(e) else 403
        return set_cors_headers(error_response(str(e), status))
    except Exception as e:
        print(f'Error in free_tries: {e}')
        return set_cors_headers(error_response(str(e), 500))
