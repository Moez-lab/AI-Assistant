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
            
            # Emotion Analysis (Separate call for speed, or integrated if possible)
            # Find is fast, analyze is slow. Let's do analyze only if face found.
            emotion = "Neutral"
            try:
                 analysis = DeepFace.analyze(frame, actions=['emotion'], detector_backend='ssd', enforce_detection=False, silent=True)
                 if analysis:
                     emotion = analysis[0]['dominant_emotion']
            except:
                 pass
            
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
                except:
                    pass
            
            # Push extended result
            if not result_queue.full():
                result_queue.put((name, distance, emotion))
                    
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
unknown_counter = 0
sentry_mode_triggered = False
emotion = "Neutral"

while True:
    ret, frame = cap.read()
    if not ret: break
    
    # 1. Send frame to Brain Thread (Non-blocking)
    if frame_count % 5 == 0: # Check face every 5 frames
        if not frame_queue.full():
            frame_queue.put(frame.copy())
            
    # 2. Check for results from Brain Thread
    try:
        # Unpack 3 values now
        name, distance, emotion = result_queue.get_nowait()
        last_name = name
        last_distance = distance
        
        # --- SENTRY MODE LOGIC ---
        if name == "Unknown":
            unknown_counter += 1
        else:
            unknown_counter = 0 # Reset if known face seen
            
        if unknown_counter > 50: # Approx 5-10 seconds depending on framerate
             sentry_mode_triggered = True
        else:
             sentry_mode_triggered = False
        
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

    # 3. Render Sci-Fi HUD
    
    # Colors (BGR)
    CYAN = (255, 255, 0)
    Blue = (255, 0, 0)
    Green = (0, 255, 0)
    Red = (0, 0, 255)
    White = (255, 255, 255)
    
    height, width, _ = frame.shape
    
    # Draw Corner Brackets (Futuristic Look)
    d = 40 # length of bracket line
    t = 2 # thickness
    
    # Top Left
    cv2.line(frame, (20, 20), (20+d, 20), CYAN, t)
    cv2.line(frame, (20, 20), (20, 20+d), CYAN, t)
    
    # Top Right
    cv2.line(frame, (width-20, 20), (width-20-d, 20), CYAN, t)
    cv2.line(frame, (width-20, 20), (width-20, 20+d), CYAN, t)
    
    # Bottom Left
    cv2.line(frame, (20, height-20), (20+d, height-20), CYAN, t)
    cv2.line(frame, (20, height-20), (20, height-20-d), CYAN, t)
    
    # Bottom Right
    cv2.line(frame, (width-20, height-20), (width-20-d, height-20), CYAN, t)
    cv2.line(frame, (width-20, height-20), (width-20, height-20-d), CYAN, t)
    
    # Identification Box
    if last_name not in ["Unknown", "Scanning..."]:
        # Recognized - Green Box
        box_color = Green 
        label = f"ID: {last_name.upper()} [{last_distance:.2f}]"
    elif last_name == "Unknown":
        # Intruder - Red Box
        box_color = Red
        display_text = "WARNING: UNKNOWN ENTITY"
    else:
        # Scanning - Blue pulsing or just text
        box_color = Blue
        display_text = f"{last_name} ({last_distance:.2f}) [{emotion}]" if last_distance > 0 else last_name
    
    # Sentry Override
    if sentry_mode_triggered:
        # Flash Red
        if frame_count % 10 < 5:
            cv2.rectangle(frame, (0,0), (width, height), (0,0,255), 20)
            cv2.putText(frame, "INTRUDER DETECTED", (width//2 - 200, height//2), cv2.FONT_HERSHEY_SIMPLEX, 2, (0,0,255), 3)
            # Play beep (simple print, actually playing sound needs library like winsound or pygame)
            # winsound.Beep(1000, 200) # Blocking, be careful.
            
    # Emotion coloring
    if emotion == "happy":
        emotion_color = (0, 255, 255) # Yellow
    elif emotion == "sad":
        emotion_color = (128, 128, 128) # Grey
    elif emotion == "angry":
        emotion_color = (0, 0, 255) # Red
    else:
        emotion_color = (255, 0, 0) # Blue
        
    cv2.putText(frame, display_text, (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, emotion_color, 2)
    
    # System Stats Overlay (Right Side)
    try:
        import psutil
        cpu = psutil.cpu_percent()
        mem = psutil.virtual_memory().percent
        
        cv2.putText(frame, "SYSTEM STATUS", (width-220, 50), cv2.FONT_HERSHEY_PLAIN, 1, CYAN, 1)
        cv2.putText(frame, f"CPU: {cpu}%", (width-220, 70), cv2.FONT_HERSHEY_PLAIN, 1, White, 1)
        cv2.putText(frame, f"RAM: {mem}%", (width-220, 90), cv2.FONT_HERSHEY_PLAIN, 1, White, 1)
        
        # Power
        batt = psutil.sensors_battery()
        if batt:
            cv2.putText(frame, f"PWR: {batt.percent}%", (width-220, 110), cv2.FONT_HERSHEY_PLAIN, 1, White, 1)
            
    except ImportError:
        pass

    # Clock Overlay (Bottom Left)
    now_str = time.strftime("%H:%M:%S")
    cv2.putText(frame, now_str, (30, height-30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, CYAN, 2)

    
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