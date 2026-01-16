
import cv2
import threading
import time
import asyncio
import json
import shared_state

def face_tracking_worker(broadcast_func, loop):
    """
    Background worker that analyzes frames from shared_state.
    Detects face position and broadcasts normalized coordinates (-1 to 1).
    """
    print("Face Tracker Started")
    
    # Load Haar Cascade (Fast & Lightweight)
    # Ensure opencv-python-headless or opencv-python is installed
    try:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    except Exception as e:
        print(f"Face Tracker Error: Could not load Haar Cascade. {e}")
        return

    while True:
        try:
            frame = shared_state.latest_frame
            if frame is None:
                time.sleep(0.1)
                continue

            # Convert to Grayscale for detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            # scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)

            if len(faces) > 0:
                # Find largest face (closest to camera)
                largest_face = max(faces, key=lambda f: f[2] * f[3])
                (x, y, w, h) = largest_face
                
                # Calculate center relative to frame center
                frame_h, frame_w = gray.shape
                center_x = x + w / 2
                center_y = y + h / 2
                
                # Normalize to -1 ... 1 range
                # X: 0 (left) -> 1 (right) => Map to -1 (left) -> 1 (right)
                # Note: Camera is mirrored usually?
                # If user moves left (x decreases), center_x decreases. 
                # Normalized: (center_x / frame_w) * 2 - 1
                norm_x = (center_x / frame_w) * 2 - 1
                
                # Y: 0 (top) -> 1 (bottom) => Map to 1 (up) -> -1 (down) 
                # In 3D: +Y is Up. In Image: +Y is Down.
                # So (center_y / frame_h) * 2 - 1 gives -1 (top) to 1 (bottom).
                # We want +1 for Top (look up). So invert.
                norm_y = -((center_y / frame_h) * 2 - 1)

                # Broadcast
                # Use asyncio.run_coroutine_threadsafe to talk to the async websocket loop
                if loop and loop.is_running():
                    data = {"x": norm_x, "y": norm_y}
                    # We manually construct the message payload to match ai_assistant's expectation
                    asyncio.run_coroutine_threadsafe(broadcast_func("face_track", data), loop)

            time.sleep(0.05) # 20 FPS is enough for tracking

        except Exception as e:
            print(f"Face Tracking Loop Error: {e}")
            time.sleep(1)
