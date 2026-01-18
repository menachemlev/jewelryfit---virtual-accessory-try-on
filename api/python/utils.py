"""
Utility functions for Python serverless functions
Includes HTTP helpers, environment loading, and common utilities
"""

import os
import json
from typing import Any, Dict, Optional
from flask import Response, jsonify

# Load environment variables (python-dotenv equivalent)
from dotenv import load_dotenv
load_dotenv()

def json_response(data: Any, status: int = 200, headers: Optional[Dict[str, str]] = None) -> Response:
    """
    Create a JSON response with proper headers
    
    Args:
        data: Data to serialize to JSON
        status: HTTP status code
        headers: Optional additional headers
        
    Returns:
        Flask Response object
    """
    response = jsonify(data)
    response.status_code = status
    
    if headers:
        for key, value in headers.items():
            response.headers[key] = value
    
    return response

def error_response(message: str, status: int = 500) -> Response:
    """
    Create an error response
    
    Args:
        message: Error message
        status: HTTP status code
        
    Returns:
        Flask Response with error
    """
    return json_response({'error': message}, status)

def success_response(data: Any, status: int = 200) -> Response:
    """
    Create a success response
    
    Args:
        data: Success data
        status: HTTP status code
        
    Returns:
        Flask Response with data
    """
    return json_response(data, status)

def get_env(key: str, default: Optional[str] = None) -> str:
    """
    Get environment variable with optional default
    
    Args:
        key: Environment variable name
        default: Default value if not found
        
    Returns:
        Environment variable value
    """
    return os.getenv(key, default)

def parse_json_body(request) -> dict:
    """
    Parse JSON body from request
    
    Args:
        request: Flask request object
        
    Returns:
        Parsed JSON dictionary
        
    Raises:
        ValueError: If JSON is invalid
    """
    try:
        if request.is_json:
            return request.get_json()
        else:
            # Try to parse as text
            return json.loads(request.get_data(as_text=True))
    except Exception as e:
        raise ValueError(f'Invalid JSON body: {str(e)}')

def validate_required_fields(data: dict, required_fields: list) -> Optional[str]:
    """
    Validate that required fields are present in data
    
    Args:
        data: Data dictionary to validate
        required_fields: List of required field names
        
    Returns:
        Error message if validation fails, None if successful
    """
    missing = [field for field in required_fields if field not in data or data[field] is None]
    
    if missing:
        return f"Missing required fields: {', '.join(missing)}"
    
    return None

def is_production() -> bool:
    """
    Check if running in production environment
    
    Returns:
        True if in production
    """
    return os.getenv('VERCEL_ENV') == 'production'

def get_client_ip(request) -> str:
    """
    Get client IP address from request
    
    Args:
        request: Flask request object
        
    Returns:
        Client IP address
    """
    # Check for proxy headers first
    if 'X-Forwarded-For' in request.headers:
        return request.headers['X-Forwarded-For'].split(',')[0].strip()
    elif 'X-Real-IP' in request.headers:
        return request.headers['X-Real-IP']
    else:
        return request.remote_addr or 'unknown'

def log_request(request, message: str = ''):
    """
    Log request details (helpful for debugging)
    
    Args:
        request: Flask request object
        message: Optional message to log
    """
    print(f"[{request.method}] {request.path} - {get_client_ip(request)} - {message}")
