import os
import cv2
from deepface import DeepFace

# Path to database
db_path = "C:/Users/mueez/OneDrive/Desktop/assignment/face-database/"

print(f"Testing DeepFace with DB at: {db_path}")

# Check if DB exists
if not os.path.exists(db_path):
    print("FATAL: Database path does not exist.")
    exit()

# List files to be sure
files = os.listdir(db_path)
print(f"Root files: {files}")

# Try to find a face in one of the known images themselves (Self-test)
test_image_path = os.path.join(db_path, "mueez.jpg")
if not os.path.exists(test_image_path):
    # Try getting one from subfolder
    sub_path = os.path.join(db_path, "mueez")
    if os.path.exists(sub_path):
        sub_files = os.listdir(sub_path)
        if sub_files:
            test_image_path = os.path.join(sub_path, sub_files[0])

print(f"Using test image: {test_image_path}")

try:
    img = cv2.imread(test_image_path)
    if img is None:
        print("Failed to load test image.")
        exit()
        
    print("Running DeepFace.find...")
    results = DeepFace.find(
        img_path = img,
        db_path = db_path,
        detector_backend = 'ssd',
        model_name = 'Facenet',
        enforce_detection = False, 
        silent = False
    )
    
    print("\n--- Results ---")
    if len(results) > 0:
        print(results[0])
        print("SUCCESS: Face recognition is working.")
    else:
        print("WARNING: No matches found (but no crash).")

except Exception as e:
    print(f"\nCRASHED: {e}")
