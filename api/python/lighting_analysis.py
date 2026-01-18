"""
Vercel Serverless Function: Lighting Analysis
Analyzes lighting conditions using Gemini 1.5 Flash
"""

import os
import json
import base64
from io import BytesIO
from PIL import Image
import google.generativeai as genai
from http.server import BaseHTTPRequestHandler


def resize_image(image_data: bytes, max_dimension: int = 1920) -> bytes:
    """Resize image to prevent error 413"""
    img = Image.open(BytesIO(image_data))
    
    if max(img.size) > max_dimension:
        ratio = max_dimension / max(img.size)
        new_size = tuple(int(dim * ratio) for dim in img.size)
        img = img.resize(new_size, Image.Resampling.LANCZOS)
    
    output = BytesIO()
    img.save(output, format='JPEG', quality=95)
    return output.getvalue()


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Get API key
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                self.send_error(500, 'GEMINI_API_KEY not configured')
                return
            
            # Configure Gemini
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            # Parse request
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            
            # Get image data
            if 'image' not in data:
                self.send_error(400, 'Missing image data')
                return
            
            # Decode base64 image
            image_data = base64.b64decode(data['image'].split(',')[1] if ',' in data['image'] else data['image'])
            
            # Resize if needed
            image_data = resize_image(image_data)
            
            # Open image
            img = Image.open(BytesIO(image_data))
            
            # Analyze lighting
            prompt = """Analyze the lighting in this image of an arm/wrist. 
            Describe in 1-2 concise sentences:
            1. Lighting direction (e.g., from left, above, diffused)
            2. Temperature (warm/cool/neutral)
            3. Shadow intensity (soft/moderate/harsh)
            
            Focus only on the lighting that affects the wrist area where a watch would be worn.
            Be specific and descriptive to help with realistic image generation."""
            
            response = model.generate_content([prompt, img])
            lighting_description = response.text.strip()
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            result = {
                'success': True,
                'lighting_analysis': lighting_description
            }
            
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_result = {
                'success': False,
                'error': str(e)
            }
            
            self.wfile.write(json.dumps(error_result).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
