import os
import sys
import time
import threading
import queue
import cv2
from deepface import DeepFace
import ai_assistant

# Force output to UTF-8
sys.stdout.reconfigure(encoding='utf-8')
os.environ['TF_USE_LEGACY_KERAS'] = '1'

# --- Parallel Setup ---
frame_queue = queue.Queue(maxsize=1) # Only keep latest frame
result_queue = queue.Queue(maxsize=1) 
# ----------------------

# Global state
assistant_status = "Idle"
known_faces_path = "C:/Users/mueez/OneDrive/Desktop/assignment/face-database/"

def face_recognition_worker():
    """Background thread that processes frames for faces."""
    print("Brain Thread (Vision) Started...")
    while True:
        try:
            # Get frame (blocking until available)
            frame = frame_queue.get()
            
            # Run DeepFace (Heavy computation)
            # using 'ssd' backend as it is faster/more robust than opencv
            results = DeepFace.find(
                img_path = frame,
                db_path = known_faces_path,
                detector_backend = 'ssd',
                model_name = 'Facenet',
                enforce_detection = True,
                silent = True
            )
            
            name = "Unknown"
            distance = 0.0
            
            if len(results) > 0 and not results[0].empty:
                identity_path = results[0]['identity'].iloc[0]
                distance = results[0]['distance'].iloc[0]
                
                if distance < 0.40:
                    identity_path = identity_path.replace('\\', '/')
                    path_parts = identity_path.split('/')
                    name = path_parts[-2] if len(path_parts) >= 2 else path_parts[-1].split('.')[0]
            
            # Push result to main thread
            if not result_queue.full():
                result_queue.put((name, distance))
            else:
                try:
                    result_queue.get_nowait()
                    result_queue.put((name, distance))
                except:
                    pass
                    
        except Exception as e:
            # print(f"Vision Error: {e}")
            pass

# Start Face Thread
threading.Thread(target=face_recognition_worker, daemon=True).start()

def run_assistant_interaction(name):
    """Assistant Logic Thread (Voice/AI)"""
    def interaction():
        global assistant_status
        assistant_status = "Greeting..."
        ai_assistant.speak(f"Hi {name}, whats up")
        
        def update_status(status):
            global assistant_status
            assistant_status = status
            
        def handle_command(text):
            return ai_assistant.process_command(text)
            
        ai_assistant.listen_loop(update_status, handle_command)
    
    threading.Thread(target=interaction, daemon=True).start()

# --- Main UI Thread ---
cap = cv2.VideoCapture(0)
cap.set(3, 640)
cap.set(4, 480)

print("Starting Parallel System... Press 'q' to quit.")

last_name = "Scanning..."
last_distance = 0.0
last_spoken_time = 0
cooldown_seconds = 21600 

frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret: break
    
    # 1. Send frame to Brain Thread (Non-blocking)
    if frame_count % 5 == 0: # Check face every 5 frames
        if not frame_queue.full():
            frame_queue.put(frame.copy())
            
    # 2. Check for results from Brain Thread
    try:
        name, distance = result_queue.get_nowait()
        last_name = name
        last_distance = distance
        
        # Trigger Assistant if valid user found
        if name.lower() == "mueez":
            current_time = time.time()
            if current_time - last_spoken_time > cooldown_seconds:
                run_assistant_interaction(name)
                last_spoken_time = current_time
    except queue.Empty:
        pass # No new result yet, keep using old one
        
    frame_count += 1

    # Check for reminders periodically (e.g. every 100 frames ~ 3-5 seconds depending on fps)
    if frame_count % 100 == 0:
        try:
            ai_assistant.check_reminders()
        except:
             pass

    # 3. Render UI (Always fast)
    color = (0, 255, 0) if last_name not in ["Unknown", "Scanning..."] else (0, 0, 255)
    display_text = f"{last_name} ({last_distance:.2f})" if last_distance > 0 else last_name
    
    cv2.putText(frame, display_text, (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
    
    # Status
    status_color = (255, 255, 0)
    if assistant_status == "Listening...": status_color = (0, 255, 0)
    elif assistant_status == "Processing...": status_color = (0, 0, 255)
    cv2.putText(frame, assistant_status, (50, 430), cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)
    
    cv2.imshow("Parallel AI System", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()