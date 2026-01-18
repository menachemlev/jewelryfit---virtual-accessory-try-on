"""
Vercel Serverless Function: Process Virtual Try-On
Main entry point for watch try-on processing
Note: Due to Vercel's limitations, this uses a simplified approach
For production, consider using a separate backend service
"""

import os
import json
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from http.server import BaseHTTPRequestHandler


def add_watermark(image: Image.Image, text: str = "JewelryFit AI") -> Image.Image:
    """Add watermark to image"""
    img_with_watermark = image.copy().convert('RGBA')
    overlay = Image.new('RGBA', img_with_watermark.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)
    
    try:
        font = ImageFont.truetype("arial.ttf", 30)
    except:
        font = ImageFont.load_default()
    
    # Bottom right position
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = img_with_watermark.width - text_width - 20
    y = img_with_watermark.height - text_height - 20
    
    draw.text((x, y), text, fill=(255, 255, 255, 128), font=font)
    
    img_with_watermark = Image.alpha_composite(img_with_watermark, overlay)
    return img_with_watermark.convert('RGB')


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Parse request
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            
            # For Vercel serverless, we provide a simplified response
            # directing users to use the full pipeline on a dedicated backend
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            result = {
                'success': False,
                'message': 'Full try-on processing requires a dedicated backend service.',
                'recommendation': 'Deploy jewelry_tryon_pipeline.py to Google Cloud Run, AWS Lambda, or Azure Functions for production use.',
                'lightweight_alternative': 'Use /api/python/lighting_analysis for lighting analysis only.',
                'documentation': 'See DEPLOYMENT_GUIDE.md for deployment options.'
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
