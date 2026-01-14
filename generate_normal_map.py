import numpy as np
from PIL import Image
import scipy.ndimage
import sys
import os

def generate_normal_map(input_path, output_path, intensity=1.0):
    print(f"Generating normal map for {input_path}...")
    try:
        img = Image.open(input_path).convert('L') # Convert to grayscale
        img_data = np.array(img).astype(float)
        
        # Invert intensity if needed (white is high, black is low)
        # Default assumes lighter = higher
        
        # Calculate gradients using Sobel filter
        sobel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
        sobel_y = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]])
        
        dx = scipy.ndimage.convolve(img_data, sobel_x)
        dy = scipy.ndimage.convolve(img_data, sobel_y)
        
        # Adjust intensity
        dx *= intensity
        dy *= intensity
        
        # Normal vector components
        # Z component is 1.0 (pointing up), stored as 255 typically but we normalize
        rows, cols = img_data.shape
        dz = np.ones((rows, cols)) * 255.0 / intensity # Adjust Z relative to XY intensity
        
        # Normalize
        norm = np.sqrt(dx*dx + dy*dy + dz*dz)
        dx /= norm
        dy /= norm
        dz /= norm
        
        # Map to 0-255 range
        # Normal map: [-1, 1] -> [0, 255]
        # R = X, G = Y, B = Z
        dx = ((dx + 1.0) / 2.0 * 255.0).astype(np.uint8)
        dy = ((dy + 1.0) / 2.0 * 255.0).astype(np.uint8)
        dz = ((dz + 1.0) / 2.0 * 255.0).astype(np.uint8)
        
        # Combine
        normal_map = np.dstack((dx, dy, dz))
        output_img = Image.fromarray(normal_map)
        output_img.save(output_path)
        print(f"Saved normal map to {output_path}")
        
    except Exception as e:
        print(f"Error generating normal map: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_normal_map.py <input_image> <output_image> [intensity]")
    else:
        input_file = sys.argv[1]
        output_file = sys.argv[2]
        intensity = float(sys.argv[3]) if len(sys.argv) > 3 else 5.0
        generate_normal_map(input_file, output_file, intensity)
