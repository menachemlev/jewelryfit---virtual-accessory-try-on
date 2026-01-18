"""
Vercel Python Serverless Function
GET /api/python/users/:userId/credits

Get user's current credit balance
"""

from flask import Flask, request
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from python.credits_handler import get_credits_handler

app = Flask(__name__)

@app.route('/api/python/users/<user_id>/credits', methods=['GET', 'OPTIONS'])
def handler(user_id):
    """Main handler for Vercel"""
    return get_credits_handler(request, user_id)

# For Vercel serverless
def main(req):
    """Vercel entry point"""
    with app.test_request_context(
        path=req.path,
        method=req.method,
        headers=dict(req.headers),
        query_string=req.query_string
    ):
        return handler(req.path.split('/')[-2])
