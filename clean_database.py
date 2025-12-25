import os
import sys
# Force UTF-8 encoding
sys.stdout.reconfigure(encoding='utf-8')
os.environ['TF_USE_LEGACY_KERAS'] = '1'

from deepface import DeepFace
import cv2

# Path to your database
db_path = "C:/Users/mueez/OneDrive/Desktop/assignment/face-database/"

# Backend to use (must match what setup.py uses)
detector_backend = 'ssd'

print(f"Scanning database at {db_path} using {detector_backend}...")

bad_files = []

for root, dirs, files in os.walk(db_path):
    for file in files:
        if file.lower().endswith(('.jpg', '.jpeg', '.png')):
            full_path = os.path.join(root, file)
            print(f"Checking: {file}...", end="")
            
            try:
                # Try to extract face embedding. 
                # If no face is found, this should raise an error or return empty list
                objs = DeepFace.extract_faces(
                    img_path=full_path,
                    detector_backend=detector_backend,
                    enforce_detection=True
                )
                
                if len(objs) == 0:
                     print(" NO FACE FOUND")
                     bad_files.append(full_path)
                else:
                    print(" OK")
            
            except Exception as e:
                print(f" FAILED: {str(e)}")
                bad_files.append(full_path)

print("\nScan Complete.")
print(f"Found {len(bad_files)} bad images.")

if len(bad_files) > 0:
    print("Deleting bad files...")
    for f in bad_files:
        try:
            os.remove(f)
            print(f"Deleted: {f}")
        except Exception as e:
            print(f"Could not delete {f}: {e}")
    
    # Also clear pickle files to force rebuild
    pkl_path = os.path.join(db_path, f"ds_model_facenet_detector_{detector_backend}_aligned_normalization_base_expand_0.pkl")
    if os.path.exists(pkl_path):
        os.remove(pkl_path)
        print("Deleted old cache file.")
else:
    print("No bad files found! Weird.")
