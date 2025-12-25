import os
os.environ['TF_USE_LEGACY_KERAS'] = '1'
from deepface import DeepFace
import cv2

known_faces_path = "C:/Users/mueez/OneDrive/Desktop/assignment/face-database/"
img_path = "C:/Users/mueez/OneDrive/Desktop/assignment/face-database/mueez/img1.jpg"

print("Testing DeepFace with SSD backend...")
try:
    results = DeepFace.find(
        img_path = img_path,
        db_path = known_faces_path,
        detector_backend = 'ssd',
        model_name = 'ArcFace',
        enforce_detection = True
    )
    print("Success!")
    print(results)
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"FAILED: {e}")
