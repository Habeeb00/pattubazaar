#!/usr/bin/env python3
from PIL import Image
import os
import sys

# Quality setting (0-100, 80-90 recommended for web)
QUALITY = 85

def convert_to_webp(folder_path):
    os.chdir(folder_path)  # Change to target folder
    
    print(f"Processing folder: {os.getcwd()}")
    
    for filename in os.listdir('.'):
        if filename.lower().endswith(('.webp', '.WEBP')):
            print(f"✓ Skipping WebP: {filename}")
            continue
            
        if not filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp')):
            continue
            
        try:
            img = Image.open(filename)
            name, ext = os.path.splitext(filename)
            webp_path = f"{name}.webp"
            
            # Skip if WebP already exists
            if os.path.exists(webp_path):
                print(f"✓ WebP exists: {webp_path}")
                continue
                
            img.save(webp_path, 'webp', quality=QUALITY)
            print(f"✓ Converted: {filename} → {webp_path}")
            
        except Exception as e:
            print(f"✗ Error {filename}: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 to_webp.py /path/to/your/folder")
        sys.exit(1)
    
    folder_path = sys.argv[1]
    if not os.path.exists(folder_path):
        print(f"Error: Folder '{folder_path}' not found!")
        sys.exit(1)
    
    print("Converting non-WebP images to WebP...")
    convert_to_webp(folder_path)
    print("Done!")
