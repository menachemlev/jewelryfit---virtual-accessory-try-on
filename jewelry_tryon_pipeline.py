"""
JewelryFit AI - Virtual Watch Try-On Pipeline
A comprehensive pipeline integrating Gemini 1.5 Flash, SAM/YOLO, and Imagen 3
for photorealistic watch try-on experiences.

Author: Senior Python Backend Developer
Date: January 2026
"""

import asyncio
import io
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
from collections import deque

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import google.generativeai as genai
from vertexai.preview.vision_models import ImageGenerationModel
from ultralytics import SAM, YOLO
import vertexai

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class PipelineConfig:
    """Configuration for JewelryFit AI Pipeline"""
    gemini_api_key: str
    vertex_project_id: str
    vertex_location: str = "us-central1"
    max_image_dimension: int = 1920  # Full HD max
    rate_limit_per_minute: int = 10
    watermark_text: str = "JewelryFit AI"
    watermark_opacity: int = 128
    sam_model_path: str = "sam_l.pt"
    yolo_world_model: Optional[str] = None


class RateLimiter:
    """Token bucket rate limiter for API calls"""
    
    def __init__(self, max_requests: int, time_window: int = 60):
        """
        Args:
            max_requests: Maximum number of requests allowed
            time_window: Time window in seconds (default: 60s = 1 minute)
        """
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = deque()
        
    async def acquire(self) -> None:
        """Wait until a request slot is available"""
        now = time.time()
        
        # Remove old requests outside the time window
        while self.requests and self.requests[0] < now - self.time_window:
            self.requests.popleft()
        
        # Wait if rate limit exceeded
        if len(self.requests) >= self.max_requests:
            sleep_time = self.requests[0] + self.time_window - now
            if sleep_time > 0:
                logger.warning(f"Rate limit reached. Waiting {sleep_time:.2f}s...")
                await asyncio.sleep(sleep_time)
                # Re-check after waiting
                return await self.acquire()
        
        # Record this request
        self.requests.append(now)
        logger.debug(f"Rate limiter: {len(self.requests)}/{self.max_requests} requests used")


class ImageProcessor:
    """Utility class for image processing operations"""
    
    @staticmethod
    def resize_to_full_hd(image_path: Path) -> Tuple[Image.Image, bool]:
        """
        Resize image to Full HD maximum while maintaining aspect ratio.
        Returns tuple of (processed_image, was_resized)
        """
        img = Image.open(image_path)
        original_size = img.size
        max_dimension = 1920  # Full HD
        
        # Check if resizing is needed
        if max(img.size) > max_dimension:
            # Calculate new size maintaining aspect ratio
            ratio = max_dimension / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"Resized image from {original_size} to {img.size}")
            return img, True
        
        return img, False
    
    @staticmethod
    def pil_to_cv2(pil_image: Image.Image) -> np.ndarray:
        """Convert PIL Image to OpenCV format"""
        return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    
    @staticmethod
    def cv2_to_pil(cv2_image: np.ndarray) -> Image.Image:
        """Convert OpenCV image to PIL format"""
        return Image.fromarray(cv2.cvtColor(cv2_image, cv2.COLOR_BGR2RGB))
    
    @staticmethod
    def save_temp_image(image: Image.Image, suffix: str = "temp") -> Path:
        """Save temporary image and return path"""
        temp_path = Path(f"temp_{suffix}_{int(time.time())}.png")
        image.save(temp_path)
        return temp_path


class LightingAnalysisAgent:
    """Agent for analyzing lighting conditions using Gemini 1.5 Flash"""
    
    def __init__(self, api_key: str, rate_limiter: RateLimiter):
        """
        Args:
            api_key: Google Gemini API key
            rate_limiter: Rate limiter instance
        """
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        self.rate_limiter = rate_limiter
        
    async def analyze_lighting(self, image_path: Path) -> str:
        """
        Analyze lighting conditions in the user's image.
        
        Args:
            image_path: Path to the user's arm/wrist image
            
        Returns:
            Concise lighting description (1-2 sentences)
        """
        await self.rate_limiter.acquire()
        
        try:
            # Resize image to Full HD max to avoid error 413
            img, was_resized = ImageProcessor.resize_to_full_hd(image_path)
            
            # Save temp file if resized
            if was_resized:
                temp_path = ImageProcessor.save_temp_image(img, "lighting_analysis")
                image_to_analyze = Image.open(temp_path)
            else:
                image_to_analyze = Image.open(image_path)
            
            prompt = """Analyze the lighting in this image of an arm/wrist. 
            Describe in 1-2 concise sentences:
            1. Lighting direction (e.g., from left, above, diffused)
            2. Temperature (warm/cool/neutral)
            3. Shadow intensity (soft/moderate/harsh)
            
            Focus only on the lighting that affects the wrist area where a watch would be worn.
            Be specific and descriptive to help with realistic image generation."""
            
            logger.info("Sending image to Gemini 1.5 Flash for lighting analysis...")
            response = await asyncio.to_thread(
                self.model.generate_content,
                [prompt, image_to_analyze]
            )
            
            lighting_desc = response.text.strip()
            logger.info(f"Lighting analysis: {lighting_desc}")
            
            # Cleanup temp file
            if was_resized and temp_path.exists():
                temp_path.unlink()
            
            return lighting_desc
            
        except Exception as e:
            logger.error(f"Lighting analysis failed: {e}")
            # Return a fallback description
            return "Neutral diffused lighting with moderate shadows, balanced color temperature"


class AutoMaskingAgent:
    """Agent for automatic wrist detection and mask generation using SAM/YOLO"""
    
    def __init__(self, config: PipelineConfig):
        """
        Args:
            config: Pipeline configuration
        """
        self.config = config
        self.sam_model = None
        self.yolo_model = None
        
    def _initialize_sam(self) -> None:
        """Lazy initialization of SAM model"""
        if self.sam_model is None:
            logger.info("Loading SAM model...")
            self.sam_model = SAM(self.config.sam_model_path)
            logger.info("SAM model loaded successfully")
    
    def _initialize_yolo_world(self) -> None:
        """Lazy initialization of YOLO-World model"""
        if self.yolo_model is None and self.config.yolo_world_model:
            logger.info("Loading YOLO-World model...")
            self.yolo_model = YOLO(self.config.yolo_world_model)
            logger.info("YOLO-World model loaded successfully")
    
    async def generate_wrist_mask(self, image_path: Path) -> Path:
        """
        Generate a binary mask of the wrist/arm area.
        
        Args:
            image_path: Path to the user's arm image
            
        Returns:
            Path to the generated mask image (white wrist on black background)
        """
        try:
            # Resize image to Full HD max
            img, was_resized = ImageProcessor.resize_to_full_hd(image_path)
            
            if was_resized:
                temp_input = ImageProcessor.save_temp_image(img, "mask_input")
                image_to_process = temp_input
            else:
                image_to_process = image_path
            
            # Initialize SAM model
            self._initialize_sam()
            
            # Load image with OpenCV
            img_cv = cv2.imread(str(image_to_process))
            height, width = img_cv.shape[:2]
            
            logger.info("Detecting wrist area with SAM...")
            
            # Option 1: Use SAM with automatic segmentation
            # Generate masks for all objects in the image
            results = self.sam_model(img_cv)
            
            if len(results) > 0 and hasattr(results[0], 'masks'):
                # Find the largest mask (likely the arm/wrist)
                masks = results[0].masks.data.cpu().numpy()
                largest_mask_idx = np.argmax([mask.sum() for mask in masks])
                wrist_mask = masks[largest_mask_idx]
                
                # Convert to binary mask
                mask_binary = (wrist_mask * 255).astype(np.uint8)
                
                # Resize mask to match image dimensions
                if mask_binary.shape != (height, width):
                    mask_binary = cv2.resize(mask_binary, (width, height))
                
            else:
                # Fallback: Create a mask focusing on center region
                logger.warning("SAM detection failed, using center region fallback")
                mask_binary = self._create_center_mask(width, height)
            
            # Apply morphological operations to smooth the mask
            kernel = np.ones((15, 15), np.uint8)
            mask_binary = cv2.morphologyEx(mask_binary, cv2.MORPH_CLOSE, kernel)
            mask_binary = cv2.morphologyEx(mask_binary, cv2.MORPH_OPEN, kernel)
            
            # Save mask
            mask_path = Path(f"mask_{int(time.time())}.png")
            cv2.imwrite(str(mask_path), mask_binary)
            logger.info(f"Wrist mask saved to {mask_path}")
            
            # Cleanup temp files
            if was_resized and temp_input.exists():
                temp_input.unlink()
            
            return mask_path
            
        except Exception as e:
            logger.error(f"Mask generation failed: {e}")
            # Create a fallback center mask
            img = Image.open(image_path)
            width, height = img.size
            mask_binary = self._create_center_mask(width, height)
            mask_path = Path(f"mask_fallback_{int(time.time())}.png")
            cv2.imwrite(str(mask_path), mask_binary)
            return mask_path
    
    @staticmethod
    def _create_center_mask(width: int, height: int) -> np.ndarray:
        """Create a fallback mask focusing on the center region"""
        mask = np.zeros((height, width), dtype=np.uint8)
        center_x, center_y = width // 2, height // 2
        radius_x, radius_y = width // 3, height // 3
        cv2.ellipse(mask, (center_x, center_y), (radius_x, radius_y), 
                   0, 0, 360, 255, -1)
        return mask


class GenerativeInpaintingAgent:
    """Agent for watch inpainting using Vertex AI Imagen 3"""
    
    def __init__(self, config: PipelineConfig, rate_limiter: RateLimiter):
        """
        Args:
            config: Pipeline configuration
            rate_limiter: Rate limiter instance
        """
        self.config = config
        self.rate_limiter = rate_limiter
        
        # Initialize Vertex AI
        vertexai.init(
            project=config.vertex_project_id,
            location=config.vertex_location
        )
        self.model = ImageGenerationModel.from_pretrained("imagen-3.0-capability-001")
        logger.info("Initialized Imagen 3.0 capability model")
    
    async def apply_watch(
        self,
        base_image_path: Path,
        mask_image_path: Path,
        watch_reference_path: Path,
        lighting_description: str
    ) -> Image.Image:
        """
        Apply watch to wrist using generative inpainting.
        
        Args:
            base_image_path: User's arm/wrist image
            mask_image_path: Binary mask of wrist area
            watch_reference_path: Reference image of the watch
            lighting_description: Lighting conditions from Gemini analysis
            
        Returns:
            Final image with watch applied
        """
        await self.rate_limiter.acquire()
        
        try:
            # Resize all images to Full HD max
            base_img, _ = ImageProcessor.resize_to_full_hd(base_image_path)
            mask_img, _ = ImageProcessor.resize_to_full_hd(mask_image_path)
            watch_img, _ = ImageProcessor.resize_to_full_hd(watch_reference_path)
            
            # Save temp files
            temp_base = ImageProcessor.save_temp_image(base_img, "base")
            temp_mask = ImageProcessor.save_temp_image(mask_img, "mask")
            temp_watch = ImageProcessor.save_temp_image(watch_img, "watch")
            
            # Construct detailed prompt
            prompt = self._construct_prompt(lighting_description)
            negative_prompt = self._get_negative_prompt()
            
            logger.info("Applying watch with Imagen 3...")
            logger.info(f"Prompt: {prompt}")
            logger.info(f"Negative prompt: {negative_prompt}")
            
            # Load images as bytes
            base_bytes = self._load_image_bytes(temp_base)
            mask_bytes = self._load_image_bytes(temp_mask)
            reference_bytes = self._load_image_bytes(temp_watch)
            
            # Generate with Imagen 3
            response = await asyncio.to_thread(
                self.model.edit_image,
                base_image=base_bytes,
                mask=mask_bytes,
                prompt=prompt,
                negative_prompt=negative_prompt,
                edit_mode="inpainting-insert",
                number_of_images=1,
                seed=None,
                guidance_scale=15,  # Higher for more prompt adherence
                reference_image=reference_bytes  # Use watch as reference
            )
            
            # Get the generated image
            if response.images:
                result_image = response.images[0]
                # Convert to PIL Image
                final_img = self._imagen_to_pil(result_image)
                logger.info("Watch successfully applied!")
            else:
                raise ValueError("No image generated by Imagen 3")
            
            # Cleanup temp files
            for temp_file in [temp_base, temp_mask, temp_watch]:
                if temp_file.exists():
                    temp_file.unlink()
            
            return final_img
            
        except Exception as e:
            logger.error(f"Watch application failed: {e}")
            # Return original image as fallback
            return Image.open(base_image_path)
    
    def _construct_prompt(self, lighting_description: str) -> str:
        """Construct detailed prompt for Imagen 3"""
        prompt = f"""A luxury watch on a wrist, photorealistic and naturally positioned.
        
The watch should appear as if actually worn, with:
- Natural depth and dimensionality (NOT flat or sticker-like)
- Proper reflections on the watch face and band
- Subtle shadows cast on the skin
- The watch band wrapping naturally around the wrist contour
- Realistic material textures (metal/leather band, glass face)

Lighting conditions: {lighting_description}

The watch should seamlessly integrate with the existing lighting, matching:
- Shadow direction and softness
- Highlight positions on reflective surfaces  
- Overall color temperature and ambient light

High quality, 4K detail, professional product photography style."""
        
        return prompt
    
    @staticmethod
    def _get_negative_prompt() -> str:
        """Get negative prompt to avoid common issues"""
        return """sticker, flat, 2d, cartoon, bad quality, floating object, 
        unrealistic, pasted on, graphic overlay, digital sticker, 
        no depth, no shadows, bad lighting, mismatched lighting,
        low resolution, blurry, artifacts, distorted, deformed watch,
        wrong perspective, floating above skin"""
    
    @staticmethod
    def _load_image_bytes(image_path: Path) -> bytes:
        """Load image as bytes for Vertex AI"""
        with open(image_path, 'rb') as f:
            return f.read()
    
    @staticmethod
    def _imagen_to_pil(imagen_image) -> Image.Image:
        """Convert Imagen response image to PIL Image"""
        # Imagen returns image bytes
        return Image.open(io.BytesIO(imagen_image._image_bytes))


class WatermarkProcessor:
    """Post-processor for adding watermarks to images"""
    
    def __init__(self, config: PipelineConfig):
        """
        Args:
            config: Pipeline configuration
        """
        self.config = config
    
    def add_watermark(
        self,
        image: Image.Image,
        text: Optional[str] = None,
        position: str = "bottom-right"
    ) -> Image.Image:
        """
        Add semi-transparent watermark to image.
        
        Args:
            image: Input image
            text: Watermark text (uses config default if None)
            position: Position of watermark (bottom-right, bottom-left, center)
            
        Returns:
            Image with watermark applied
        """
        try:
            watermark_text = text or self.config.watermark_text
            
            # Create a copy to avoid modifying original
            img_with_watermark = image.copy()
            
            # Create transparent overlay
            overlay = Image.new('RGBA', img_with_watermark.size, (255, 255, 255, 0))
            draw = ImageDraw.Draw(overlay)
            
            # Try to load a nice font, fallback to default
            try:
                font_size = max(20, img_with_watermark.height // 30)
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
            
            # Get text bounding box
            bbox = draw.textbbox((0, 0), watermark_text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # Calculate position
            margin = 20
            if position == "bottom-right":
                x = img_with_watermark.width - text_width - margin
                y = img_with_watermark.height - text_height - margin
            elif position == "bottom-left":
                x = margin
                y = img_with_watermark.height - text_height - margin
            elif position == "center":
                x = (img_with_watermark.width - text_width) // 2
                y = (img_with_watermark.height - text_height) // 2
            else:
                x = margin
                y = margin
            
            # Draw text with semi-transparency
            draw.text(
                (x, y),
                watermark_text,
                fill=(255, 255, 255, self.config.watermark_opacity),
                font=font
            )
            
            # Composite the watermark
            img_with_watermark = img_with_watermark.convert('RGBA')
            img_with_watermark = Image.alpha_composite(img_with_watermark, overlay)
            img_with_watermark = img_with_watermark.convert('RGB')
            
            logger.info("Watermark added successfully")
            return img_with_watermark
            
        except Exception as e:
            logger.error(f"Watermark addition failed: {e}")
            return image  # Return original on failure


class JewelryTryOnPipeline:
    """
    Main pipeline orchestrator for JewelryFit AI virtual try-on.
    Integrates lighting analysis, auto-masking, and generative inpainting.
    """
    
    def __init__(self, config: PipelineConfig):
        """
        Args:
            config: Pipeline configuration
        """
        self.config = config
        self.rate_limiter = RateLimiter(config.rate_limit_per_minute)
        
        # Initialize agents
        self.lighting_agent = LightingAnalysisAgent(
            config.gemini_api_key,
            self.rate_limiter
        )
        self.masking_agent = AutoMaskingAgent(config)
        self.inpainting_agent = GenerativeInpaintingAgent(
            config,
            self.rate_limiter
        )
        self.watermark_processor = WatermarkProcessor(config)
        
        logger.info("JewelryTryOnPipeline initialized successfully")
    
    async def process(
        self,
        user_image_path: str,
        watch_image_path: str,
        output_path: str,
        add_watermark: bool = True,
        jewelry_type: str = "watch"
    ) -> Dict[str, Any]:
        """
        Execute the full try-on pipeline.
        
        Args:
            user_image_path: Path to user's arm/wrist image
            watch_image_path: Path to watch reference image
            output_path: Path to save the final result
            add_watermark: Whether to add watermark (True for free tier)
            jewelry_type: Type of jewelry ("watch", "bracelet", etc.)
            
        Returns:
            Dictionary containing result status and metadata
        """
        start_time = time.time()
        
        try:
            logger.info("="*60)
            logger.info("Starting JewelryFit AI Try-On Pipeline")
            logger.info(f"Jewelry Type: {jewelry_type}")
            logger.info("="*60)
            
            user_img_path = Path(user_image_path)
            watch_img_path = Path(watch_image_path)
            output_img_path = Path(output_path)
            
            # Validate input files
            if not user_img_path.exists():
                raise FileNotFoundError(f"User image not found: {user_image_path}")
            if not watch_img_path.exists():
                raise FileNotFoundError(f"Watch image not found: {watch_image_path}")
            
            # Step 1: Analyze lighting
            logger.info("\n[Step 1/4] Analyzing lighting conditions...")
            lighting_desc = await self.lighting_agent.analyze_lighting(user_img_path)
            
            # Step 2: Generate wrist mask
            logger.info("\n[Step 2/4] Generating wrist mask...")
            mask_path = await self.masking_agent.generate_wrist_mask(user_img_path)
            
            # Step 3: Apply watch with inpainting
            logger.info("\n[Step 3/4] Applying watch with AI inpainting...")
            result_image = await self.inpainting_agent.apply_watch(
                user_img_path,
                mask_path,
                watch_img_path,
                lighting_desc
            )
            
            # Step 4: Add watermark if requested
            if add_watermark:
                logger.info("\n[Step 4/4] Adding watermark...")
                result_image = self.watermark_processor.add_watermark(result_image)
            else:
                logger.info("\n[Step 4/4] Skipping watermark (premium user)")
            
            # Save final result
            result_image.save(output_img_path, quality=95)
            
            elapsed_time = time.time() - start_time
            
            logger.info("\n" + "="*60)
            logger.info(f"✓ Pipeline completed successfully in {elapsed_time:.2f}s")
            logger.info(f"✓ Output saved to: {output_path}")
            logger.info("="*60)
            
            # Cleanup temporary mask
            if mask_path.exists():
                mask_path.unlink()
            
            return {
                "success": True,
                "output_path": str(output_img_path),
                "processing_time": elapsed_time,
                "lighting_analysis": lighting_desc,
                "jewelry_type": jewelry_type,
                "watermarked": add_watermark
            }
            
        except Exception as e:
            logger.error(f"\n✗ Pipeline failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "processing_time": time.time() - start_time
            }
    
    async def process_batch(
        self,
        batch_requests: list[Dict[str, Any]]
    ) -> list[Dict[str, Any]]:
        """
        Process multiple try-on requests in batch (respects rate limiting).
        
        Args:
            batch_requests: List of request dictionaries with keys:
                - user_image_path
                - watch_image_path
                - output_path
                - add_watermark (optional)
                - jewelry_type (optional)
                
        Returns:
            List of result dictionaries
        """
        logger.info(f"Processing batch of {len(batch_requests)} requests...")
        
        tasks = [
            self.process(
                req["user_image_path"],
                req["watch_image_path"],
                req["output_path"],
                req.get("add_watermark", True),
                req.get("jewelry_type", "watch")
            )
            for req in batch_requests
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Convert exceptions to error dictionaries
        formatted_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                formatted_results.append({
                    "success": False,
                    "error": str(result),
                    "request_index": i
                })
            else:
                formatted_results.append(result)
        
        return formatted_results


# =============================================================================
# Main Demonstration
# =============================================================================

async def main():
    """Demonstration of the JewelryFit AI Pipeline"""
    
    # Configuration
    config = PipelineConfig(
        gemini_api_key="YOUR_GEMINI_API_KEY",  # Replace with actual key
        vertex_project_id="YOUR_GCP_PROJECT_ID",  # Replace with actual project
        vertex_location="us-central1",
        max_image_dimension=1920,
        rate_limit_per_minute=10,
        watermark_text="JewelryFit AI",
        watermark_opacity=128,
        sam_model_path="sam_l.pt"  # Download from Ultralytics
    )
    
    # Initialize pipeline
    pipeline = JewelryTryOnPipeline(config)
    
    # Example 1: Single try-on
    print("\n" + "="*80)
    print("EXAMPLE 1: Single Watch Try-On")
    print("="*80)
    
    result = await pipeline.process(
        user_image_path="sample_arm.jpg",
        watch_image_path="sample_watch.jpg",
        output_path="output_try_on.jpg",
        add_watermark=True,  # Free tier
        jewelry_type="watch"
    )
    
    if result["success"]:
        print(f"\n✓ Success! Result saved to: {result['output_path']}")
        print(f"✓ Processing time: {result['processing_time']:.2f}s")
        print(f"✓ Lighting detected: {result['lighting_analysis']}")
    else:
        print(f"\n✗ Failed: {result['error']}")
    
    # Example 2: Batch processing
    print("\n" + "="*80)
    print("EXAMPLE 2: Batch Processing")
    print("="*80)
    
    batch_requests = [
        {
            "user_image_path": "user1_arm.jpg",
            "watch_image_path": "watch_gold.jpg",
            "output_path": "output_user1_gold.jpg",
            "add_watermark": False,  # Premium user
            "jewelry_type": "watch"
        },
        {
            "user_image_path": "user2_arm.jpg",
            "watch_image_path": "watch_silver.jpg",
            "output_path": "output_user2_silver.jpg",
            "add_watermark": True,  # Free user
            "jewelry_type": "watch"
        }
    ]
    
    batch_results = await pipeline.process_batch(batch_requests)
    
    print(f"\nProcessed {len(batch_results)} requests:")
    for i, result in enumerate(batch_results):
        status = "✓" if result["success"] else "✗"
        print(f"  {status} Request {i+1}: {result.get('output_path', result.get('error'))}")


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())
