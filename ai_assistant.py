import webbrowser
import os
import time
import datetime
import re

try:
    import noisereduce as nr
except ImportError:
    nr = None
    print("Warning: noisereduce not installed or failed to import. ANC disabled.")
except Exception as e:
    nr = None
    print(f"Warning: noisereduce import error: {e}")

try:
    import pyautogui
except ImportError:
    print("Warning: pyautogui not installed. System control disabled.")
    pyautogui = None

try:
    import psutil
except ImportError:
    print("Warning: psutil not installed. System monitoring disabled.")
    psutil = None

import numpy as np
import io
import speech_recognition as sr
import pyttsx3
import datetime
import asyncio
import edge_tts
import pygame
import asyncio
import edge_tts
import pygame
import requests
import json
import dateparser
from duckduckgo_search import DDGS
import shutil
import glob
try:
    import vision_utils
except:
    vision_utils = None
    print("Warning: vision_utils not found (or cv2 issue). Vision disabled.")

# Initialize TTS engine
# Global engine removed to prevent threading issues
# engine = pyttsx3.init()

# --- Memory ---
conversation_history = [] # List of (User, Bot) tuples
MAX_HISTORY = 5
MAX_HISTORY = 5
REMINDERS_FILE = "reminders.json"
SETTINGS_FILE = "settings.json"

# Voice Configuration
VOICE_MAP = {
    "1": {"id": "en-US-AnaNeural", "name": "Ana (Female, Cute)"},
    "2": {"id": "en-US-ChristopherNeural", "name": "Christopher (Male, Mature)"},
    "3": {"id": "en-US-AriaNeural", "name": "Aria (Female, Professional)"},
    "4": {"id": "en-US-GuyNeural", "name": "Guy (Male, Professional)"},
    "5": {"id": "en-US-JennyNeural", "name": "Jenny (Female, Soft)"},
    "6": {"id": "en-US-EricNeural", "name": "Eric (Male, Assertive)"}
}

# Default settings
current_settings = {
    "voice": VOICE_MAP["1"]["id"],
    "voice_list": VOICE_MAP, # Save this so user can see it in JSON
    "require_wake_word": True # Default to True if missing
}

def load_settings():
    global current_settings
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                # We prioritize our code's voice list structure if it's new
                data["voice_list"] = VOICE_MAP 
                current_settings.update(data)
        except:
            pass
    
    # Force save immediately to populate the file if it lacks new fields
    save_settings()

def save_settings():
    with open(SETTINGS_FILE, "w") as f:
        json.dump(current_settings, f, indent=4)

# Load settings on startup
load_settings()
# --------------

# Initialize mixer once for speed
try:
    pygame.mixer.init()
except:
    pass

import queue
import threading
import sys
from collections import deque
import random
import asyncio
import websockets
import json

# --- Emotion State ---
emotion_queue = deque(maxlen=10) # Store last 10 emotions for smoothing
current_emotion = "Neutral"

# --- Avatar WebSocket State ---
connected_clients = set()
avatar_loop = None

async def avatar_handler(websocket):
    connected_clients.add(websocket)
    try:
        await websocket.wait_closed()
    except:
        pass
    finally:
        connected_clients.remove(websocket)

async def broadcast_avatar_message(message_type, data=None):
    if connected_clients:
        message = json.dumps({"type": message_type, "data": data})
        # Broadcast to all connected clients
        # We need to schedule this on the avatar_loop
        websockets.broadcast(connected_clients, message)

def avatar_server_worker():
    """Runs the WebSocket server for the 3D Avatar."""
    async def main():
        global avatar_loop
        avatar_loop = asyncio.get_running_loop()
        async with websockets.serve(avatar_handler, "localhost", 8765):
            print("Avatar Server running on ws://localhost:8765")
            await asyncio.Future() # Run forever

    # Create new event loop for this thread
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(main())

threading.Thread(target=avatar_server_worker, daemon=True, name="Avatar_Server").start()

def update_emotion(new_emotion):
    """Updates the internal emotion state with smoothing."""
    global current_emotion
    emotion_queue.append(new_emotion)
    
    # Find dominant emotion in recent history
    try:
        if len(emotion_queue) > 0:
            # Simple majority vote
            from collections import Counter
            counts = Counter(emotion_queue)
            dominant = counts.most_common(1)[0][0]
            current_emotion = dominant.lower()
    except:
        pass

# ... (Previous imports exist above, we are just ensuring we have what we need)

# --- TTS Threading Setup ---
tts_text_queue = queue.Queue() # Text chunks waiting for generation
tts_audio_queue = queue.Queue() # Audio blobs waiting for playback
shutdown_event = threading.Event()
playback_generation_id = 0 # Counter to invalidate stale audio on stop

def tts_generator_worker():
    """Background worker 1: CONVERTS Text -> Audio."""
    print("TTS Generator Started")
    
    async def _generate_audio(text, voice):
        communicate = edge_tts.Communicate(text, voice)
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        return audio_data

    while not shutdown_event.is_set():
        try:
            # Block until text is available
            item = tts_text_queue.get(timeout=1)
            text = item["text"]
            gen_id = item["id"]
            
            # Helper to check if we should abort generation
            if gen_id != playback_generation_id:
                tts_text_queue.task_done()
                continue
            
            # Get current voice preference
            voice = current_settings.get("voice", VOICE_MAP["1"]["id"])
            
            # Generate Audio
            try:
                audio_bytes = asyncio.run(_generate_audio(text, voice))
                if audio_bytes and gen_id == playback_generation_id:
                    tts_audio_queue.put({"audio": audio_bytes, "id": gen_id})
            except Exception as e:
                print(f"TTS Gen Error: {e}")
            
            tts_text_queue.task_done()
            
        except queue.Empty:
            continue
        except Exception as e:
            print(f"TTS Generator Error: {e}")

def tts_player_worker():
    """Background worker 2: PLAYS Audio -> Speaker."""
    print("TTS Player Started")
    
    while not shutdown_event.is_set():
        try:
            item = tts_audio_queue.get(timeout=1)
            audio_bytes = item["audio"]
            gen_id = item["id"]
            
            # Discard stale audio from before a stop
            if gen_id != playback_generation_id:
                tts_audio_queue.task_done()
                continue
                
            try:
                if audio_bytes:
                    if not pygame.mixer.get_init():
                         pygame.mixer.init()
                         
                    audio_buffer = io.BytesIO(audio_bytes)
                    pygame.mixer.music.load(audio_buffer)
                    
                    # Notify Avatar: START
                    # We need to run async function from sync thread.
                    if avatar_loop:
                        asyncio.run_coroutine_threadsafe(broadcast_avatar_message("speak_start"), avatar_loop)
                    
                    pygame.mixer.music.play()
                    
                    # BLOCKING WAIT (while verifying not stopped)
                    while pygame.mixer.music.get_busy():
                        if gen_id != playback_generation_id:
                            pygame.mixer.music.stop()
                            break
                        time.sleep(0.05)
                        
                    # Notify Avatar: STOP
                    if avatar_loop:
                        asyncio.run_coroutine_threadsafe(broadcast_avatar_message("speak_stop"), avatar_loop)
                        
            except Exception as e:
                print(f"Playback Error: {e}")
                
            tts_audio_queue.task_done()
            
        except queue.Empty:
            continue
        except Exception as e:
             print(f"TTS Player Error: {e}")


# Start both workers
threading.Thread(target=tts_generator_worker, daemon=True, name="TTS_Generator").start()
threading.Thread(target=tts_player_worker, daemon=True, name="TTS_Player").start()

def stop_speaking():
    """Stops audio and invalidates pending queues."""
    global playback_generation_id
    
    # 1. Invalidate current generation ID (Effective Logical Clear)
    playback_generation_id += 1
    
    # 2. Physically clear queues to free memory
    with tts_text_queue.mutex:
        tts_text_queue.queue.clear()
    with tts_audio_queue.mutex:
        tts_audio_queue.queue.clear()
    
    # 3. Stop actual audio
    if pygame.mixer.get_init() and pygame.mixer.music.get_busy():
        pygame.mixer.music.stop()

def speak(text):
    """
    Non-blocking speak function. Pushes text to the background worker.
    """
    if not text: return
    print(f"Assistant: {text}")
    
    # --- Emotion Adaptation (Speech) ---
    # If Angry, be short and apologetic.
    if current_emotion == "angry":
        # Check if text is long, if so, summarize or apologize
        if len(text) > 50:
             text = "I am sorry. I will try to do better."
        else:
             text = "I understand. " + text

    # --- Action Mapping for Cuteness (Preprocessing) ---
    replacements = {
        r'[\(\*]+(laughs|laughter|laughing|chuckles|giggles|rofl|lol)[\)\*]+': ' Haha! ',
        r'[\(\*]+(sighs|sighing)[\)\*]+': ' hh... ',
        r'[\(\*]+(clears throat|ahem)[\)\*]+': ' mm-hm ',
        r'[\(\*]+(gasps|gasp)[\)\*]+': ' oh! ',
        r'[\(\*]+(yawn|yawns)[\)\*]+': ' yawn... ',
        r'[\(\*]+(cries|sobs|sniffles)[\)\*]+': ' snff... ',
        r'[\(\*]+(hums|humming)[\)\*]+': ' hmm hmm ',
        r'[\(\*]+(screams|shouts)[\)\*]+': ' ah! ',
        r'[\(\*]+(smirk|smirks|smirking)[\)\*]+': ' heh. ',
        r'[\(\*]+(blushes|shy|acting shy)[\)\*]+': ' um... ',
        r'[\(\*]+(pauses|thinking|thinks)[\)\*]+': ' hmm... ',
        r'[\(\*]+(winks|nods|shrugs|smiles|frowns|looks|points|waves|stares|leans|bounces|beams)[\)\*]+': '', # Silent actions
    }

    for pattern, replacement in replacements.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    # Clean up "..." which sounds bad in TTS
    text = re.sub(r'(\.\.\.|…)', ' ', text)
    
    # Final cleanup of any remaining bracketed text
    text = re.sub(r'\s*[\(\*][^\)\*]+[\)\*]\s*', ' ', text)
    
    text = text.strip()
    if text:
        # Notify Avatar: Start Speaking
        # We can't await here easily as we are in main thread logic potentially.
        # But we can fire-and-forget via the loop if accessible, or just queue it.
        # Ideally, we put a "message" in the audio queue too? 
        # Actually, simpler: Use the tts_player_worker to send events when AUDIO actually starts/stops.
        # But for now, let's just send "start" when we queue it (slightly early but okay)
        
        # NOTE: Syncing perfectly requires the PLAYER to send the event.
        # Let's modify the PLAYER worker instead?
        # Yes, let's do that. See below modifications to tts_player_worker.
        
        # Push with current ID
        tts_text_queue.put({"text": text, "id": playback_generation_id})
# (Rest of the file unchanged until process_command/chat)

# ... (Previous imports and setup)

def chat(text):
    """
    Simple conversational fallback. 
    In the future, this can be connected to an LLM API.
    """
    text = text.lower()
    
    # Greetings
    if any(x in text for x in ["hello", "hi", "hey"]):
        speak("Hello there! How can I help you today?")
        
    # Well-being
    elif "how are you" in text:
        speak("I'm functioning perfectly, thank you for asking! How are you doing?")
    elif any(x in text for x in ["i am fine", "i am good", "doing good", "doing well"]):
        speak("That is wonderful to hear!")
    elif any(x in text for x in ["not good", "bad", "sad"]):
        speak("I am sorry to hear that. I hope I can make your day a little better.")
        
    # Identity
    elif "your name" in text:
        speak("I don't have a name yet, but I am your personal assistant.")
    elif "who are you" in text:
        speak("I am an AI assistant designed to help you with things.")
    elif "cute" in text:
        speak("Aww, thank you! You are too kind.")

    # Politeness
    elif "thank" in text:
        speak("You are very welcome!")
    elif "love you" in text:
        speak("That is so sweet! I think you are great too.")
        
    else:
        speak("I heard you, but I'm not sure how to reply to that specific thing yet.")

def organize_files():
    """Organizes the Downloads folder."""
    downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
    if not os.path.exists(downloads_path):
        speak("I couldn't find your Downloads folder.")
        return

    file_types = {
        "Images": [".jpg", ".jpeg", ".png", ".gif", ".bmp"],
        "Documents": [".pdf", ".docx", ".txt", ".xlsx", ".pptx"],
        "Installers": [".exe", ".msi"],
        "Archives": [".zip", ".rar", ".7z"],
        "Videos": [".mp4", ".mkv", ".avi"]
    }
    
    count = 0
    for file in os.listdir(downloads_path):
        file_path = os.path.join(downloads_path, file)
        if os.path.isfile(file_path):
            ext = os.path.splitext(file)[1].lower()
            for folder, extensions in file_types.items():
                if ext in extensions:
                    target_folder = os.path.join(downloads_path, folder)
                    try:
                        os.makedirs(target_folder, exist_ok=True)
                        shutil.move(file_path, os.path.join(target_folder, file))
                        count += 1
                    except:
                        pass
                    break
    
    speak(f"I have organized {count} files in your Downloads folder.")

def clean_temp_files():
    """Cleans Windows temp files."""
    temp_path = os.getenv('TEMP')
    if not temp_path:
        speak("I couldn't locate the temp folder.")
        return
        
    count = 0
    # Walk and delete
    for root, dirs, files in os.walk(temp_path):
        for f in files:
            try:
                os.remove(os.path.join(root, f))
                count += 1
            except:
                pass
    speak(f"I have deleted {count} temporary junk files. Your system should be faster now.")

def see_environment():
    """Captures a frame and analyzes it using YOLO object detection."""
    print("DEBUG: see_environment() called")
    try:
        # Import YOLO detector
        from yolo_detector import get_detector
        import shared_state
        
        print("DEBUG: Imports successful")
        
        # Use shared frame from shared_state (camera already open in setup.py)
        frame = shared_state.latest_frame
        
        print(f"DEBUG: Frame is None: {frame is None}")
        
        if frame is not None:
            print("DEBUG: Getting YOLO detector...")
            # Get YOLO detector
            detector = get_detector()
            
            print("DEBUG: Running detection...")
            # Get detection summary
            summary = detector.get_detection_summary(frame)
            print(f"DEBUG: Summary: {summary}")
            speak(summary)
        else:
            speak("I couldn't access the camera feed.")
            
    except ImportError as e:
        print(f"DEBUG: Import error: {e}")
        speak("My vision system is not available. YOLO module not found.")
    except Exception as e:
        print(f"Vision Error: {e}")
        import traceback
        traceback.print_exc()
        speak("I'm having trouble with my vision right now.")

def system_control(command):
    if not pyautogui:
        speak("I don't have control over the system.")
        return

    if "screenshot" in command:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"screenshot_{timestamp}.png"
        pyautogui.screenshot(filename)
        speak(f"Screenshot taken and saved as {filename}")
    
    elif "volume up" in command:
        pyautogui.press("volumeup", presses=5)
        speak("Volume increased.")
    
    elif "volume down" in command:
        pyautogui.press("volumedown", presses=5)
        speak("Volume decreased.")
        
    elif "mute" in command:
        pyautogui.press("volumemute")
        speak("System muted.")

def get_system_status():
    if not psutil:
        return "I cannot check system status."
    
    cpu = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory().percent
    battery = psutil.sensors_battery()
    
    status = f"CPU usage is at {cpu} percent. Memory usage is at {memory} percent."
    if battery:
        status += f" Battery is at {battery.percent} percent."
        if battery.power_plugged:
             status += " and charging."
    return status

def get_weather(city=""):
    # If no city provided, try to guess from IP
    if not city:
        loc_str = get_location() # "City, Region, Country"
        if loc_str:
            city = loc_str.split(",")[0]
        else:
            return "I need to know which city to check for."
            
    try:
        # Using wttr.in for simple text based weather
        url = f"https://wttr.in/{city}?format=%C+%t"
        response = requests.get(url)
        if response.status_code == 200:
            return f"The weather in {city} is {response.text.strip()}"
        else:
             return "I couldn't fetch the weather."
    except:
        return "Weather service is unreachable."

def get_public_ip():
    """Fetches the public IP address of the network."""
    try:
        response = requests.get('https://api.ipify.org?format=json')
        if response.status_code == 200:
            return response.json()['ip']
        else:
            return None
    except Exception as e:
        print(f"IP Error: {e}")
        return None

def search_web(query):
    """Searches the web using DuckDuckGo and returns a summary."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=2))
            if results:
                # Combine snippets from top 2 results
                summary = f"Here is what I found. {results[0]['body']} Also, {results[1]['body']}"
                # Remove "..." or "…" from end of snippets to prevent "dot dot dot" reading
                summary = re.sub(r'(\.\.\.|…)$', '.', summary)
                summary = re.sub(r'(\.\.\.|…)\s', '. ', summary)
                return summary
            else:
                return "I couldn't find any information on that."
    except Exception as e:
        print(f"Search Error: {e}")
        return "I am having trouble connecting to the internet search."

def get_location():
    """Fetches the current approximate location based on IP address."""
    try:
        response = requests.get('http://ip-api.com/json/')
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'success':
                city = data.get('city')
                region = data.get('regionName')
                country = data.get('country')
                location_parts = [p for p in [city, region, country] if p]
                return ", ".join(location_parts)
            else:
                return None
        else:
            return None
    except Exception as e:
        print(f"Location Error: {e}")
        return None

def set_reminder(command):
    """Sets a reminder based on the command."""
    # Example: "remind me to call mom tomorrow at 10 AM"
    # Example: "set a reminder for 5 minutes to take out the trash"
    
    # Sort by length descending to match longest phrase first
    trigger_phrases = ["remind me to", "set a reminder to", "set a reminder for", "remind me", "reminder for", "set reminder", "remind"]
    trigger_phrases.sort(key=len, reverse=True)
    
    reminder_text = ""
    for phrase in trigger_phrases:
        if phrase in command:
            parts = command.split(phrase, 1)
            if len(parts) > 1:
                reminder_text = parts[1].strip()
            break
    
    if not reminder_text:
        speak("I'm sorry, I didn't catch what you want to be reminded about.")
        return

    # Helper to clean and parse
    def try_parse(candidate_time):
        return dateparser.parse(candidate_time, settings={'PREFER_DATES_FROM': 'future', 'RETURN_AS_TIMEZONE_AWARE': False})

    parsed_date = None
    reminder_message = reminder_text
    
    # Strategy 1: Split by ' at ' (e.g. "airport at 9:53 pm")
    if " at " in reminder_text:
        parts = reminder_text.rsplit(" at ", 1) # Split from right to get time at end
        candidate = parts[1]
        dt = try_parse(candidate)
        if dt:
            parsed_date = dt
            reminder_message = parts[0].strip()
            
    # Strategy 2: Split by ' on ' (e.g. "earbuds on 9:47")
    if not parsed_date and " on " in reminder_text:
        parts = reminder_text.rsplit(" on ", 1)
        candidate = parts[1]
        dt = try_parse(candidate)
        if dt:
            parsed_date = dt
            reminder_message = parts[0].strip()
            
    # Strategy 3: Split by ' in ' (e.g. "reminder in 5 minutes")
    # Note: dateparser handles "in 5 minutes", but we need to separate message
    if not parsed_date and " in " in reminder_text:
        parts = reminder_text.rsplit(" in ", 1)
        candidate = "in " + parts[1] # Keep "in" for dateparser
        dt = try_parse(candidate)
        if dt:
            parsed_date = dt
            reminder_message = parts[0].strip()

    # Strategy 4: Fallback - Try parsing entire string (e.g. "tomorrow")
    if not parsed_date:
        dt = try_parse(reminder_text)
        if dt:
            parsed_date = dt
            # Message is the whole text, which is a bit duplicate but safe
            pass

    if parsed_date:
        # If the parsed date is in the past, try to adjust it to the future
        if parsed_date < datetime.datetime.now():
            # Try adding a day, week, or year if it makes sense
            if "yesterday" in command or "last" in command: # User explicitly meant past
                speak("I can't set reminders for the past, *giggles*.")
                return
            
            # If it's just a time, assume for today or tomorrow
            if parsed_date.date() == datetime.datetime.now().date(): # Same day, but time passed
                parsed_date += datetime.timedelta(days=1) # Assume next day
            elif parsed_date.year == datetime.datetime.now().year and parsed_date.month == datetime.datetime.now().month and parsed_date.day < datetime.datetime.now().day:
                parsed_date += datetime.timedelta(days=7) # Assume next week if day passed
            else: # Fallback, just use it as is, but warn
                speak("Hmm, that time seems to be in the past. I'll set it for then anyway, but please check.")

        reminders = []
        if os.path.exists(REMINDERS_FILE):
            with open(REMINDERS_FILE, "r") as f:
                try:
                    reminders = json.load(f)
                except json.JSONDecodeError:
                    reminders = [] # File was empty or corrupted

        reminders.append({
            "message": reminder_message,
            "timestamp": parsed_date.timestamp(),
            "set_time": datetime.datetime.now().timestamp()
        })

        with open(REMINDERS_FILE, "w") as f:
            json.dump(reminders, f, indent=4)
        
        speak(f"Okay, I'll remind you to {reminder_message} on {parsed_date.strftime('%B %d at %I:%M %p')}.")
    else:
        speak("I couldn't understand the time for that reminder. Could you be more specific?")

def check_reminders():
    """Checks for and announces any due reminders."""
    if not os.path.exists(REMINDERS_FILE):
        return

    reminders_to_keep = []
    reminders_due = []
    current_time = datetime.datetime.now().timestamp()

    with open(REMINDERS_FILE, "r") as f:
        try:
            reminders = json.load(f)
        except json.JSONDecodeError:
            return # File empty or corrupted

    for reminder in reminders:
        if reminder["timestamp"] <= current_time:
            reminders_due.append(reminder)
        else:
            reminders_to_keep.append(reminder)
    
    if reminders_due:
        for reminder in reminders_due:
            speak(f"Reminder: {reminder['message']}")
            time.sleep(1) # Small pause between multiple reminders
        
        with open(REMINDERS_FILE, "w") as f:
            json.dump(reminders_to_keep, f, indent=4)

def listen_loop(status_callback, command_callback):
    """
    Continously listens to the microphone and triggers callbacks.
    Keeps the microphone open to reduce latency.
    Auto-reconnects if stream is closed.
    """
    reconnect_delay = 1
    
    while True: # Outer loop for connection persistence
        try:
            r = sr.Recognizer()
            r.pause_threshold = 2.0 
            r.energy_threshold = 300
            r.dynamic_energy_threshold = True # Enable dynamic adjustment for better accuracy
            
            status_callback("Adjusting noise...")
            with sr.Microphone() as source:
                # Adjust for ambient noise (longer sample for better accuracy)
                r.adjust_for_ambient_noise(source, duration=2.0)
                
                status_callback("Listening...")
                print("Microphone initialized. Starting loop...")
                
                while True: # Inner loop for processing
                    try:
                         # --- Barge-in Logic ---
                        # If assistant is speaking, we still want to listen, but with higher threshold
                        is_speaking = False
                        if pygame.mixer.get_init():
                            try:
                                is_speaking = pygame.mixer.music.get_busy()
                            except:
                                pass
                        
                        if is_speaking:
                             r.dynamic_energy_threshold = False  # Don't adapt to own voice
                             r.energy_threshold = 400            # Moderately high (enough to ignore quiet PC fans, low enough to detect user speaking over bot)
                             # Note: If this is too low, she will interrupt herself. If too high, she ignores you.
                             status_callback("Listening (Barge-in)...")
                        else:
                             r.dynamic_energy_threshold = True   # Adapt to ambient noise when silent
                             r.energy_threshold = 300            # Normal sensitivity
                             status_callback("Listening...")
                        
                        # Capture audio (Timeout removed for long sentences)
                        audio = r.listen(source, timeout=None, phrase_time_limit=None)
                    
                        # If we caught audio while speaking, STOP SPEAKING IMMEDIATELY
                        if is_speaking:
                             print("Barge-in detected! Stopping speech.")
                             stop_speaking()
                             
                        # --- Noise Reduction Step ---
                        if nr: # Only if import succeeded
                            try:
                                audio_data = np.frombuffer(audio.get_raw_data(), dtype=np.int16)
                                reduced_noise_data = nr.reduce_noise(y=audio_data, sr=audio.sample_rate, stationary=True)
                                audio = sr.AudioData(reduced_noise_data.tobytes(), audio.sample_rate, audio.sample_width)
                            except Exception as nr_error:
                                # Fail silently on NR error to keep loop going
                                pass
                        # ----------------------------

                        status_callback("Processing...")
                        text = r.recognize_google(audio)
                        print(f"You said: {text}")
                        
                        # Callback with command
                        result = command_callback(text.lower())
                        
                        if result == "exit":
                            status_callback("Idle")
                            return # Exit the function completely
                        
                    except sr.WaitTimeoutError:
                        pass # Just keep listening
                    except sr.UnknownValueError:
                        pass # Just keep listening (ignore noise)
                    except sr.RequestError as e:
                        print(f"Connection error: {e}")
                        speak("Connection error.")
                        time.sleep(5) # Wait before retry
                    except OSError as e:
                        print(f"Stream error (restarting mic): {e}")
                        break # Break inner loop to re-initialize mic
                    except Exception as e:
                        print(f"Loop error: {e}")
                        # If it looks like a stream error, we should probably restart
                        if "Stream closed" in str(e) or "Errno" in str(e):
                             print("Restarting audio stream...")
                             break
                        
        except Exception as e:
            print(f"CRITICAL ERROR in listen_loop connection: {e}")
            status_callback("retrying...")
            time.sleep(reconnect_delay)

try:
    from AppOpener import open as open_app
except ImportError:
    open_app = None
    print("Warning: AppOpener not installed. App launching disabled.")

try:
    import wikipedia
except ImportError:
    wikipedia = None
    print("Warning: wikipedia not installed. Knowledge disabled.")

def process_command(command):
    """
    Processes the command and performs actions.
    Now supports dynamic app opening and general knowledge.
    REQUIRES WAKE WORD: "Alen" or "Hey Alen"
    """
    command = command.lower()
    
    # --- Wake Word & Conversation Mode ---
    global last_interaction_time
    # Initialize if not exists or first run
    try:
        last_interaction_time
    except NameError:
        # Start in active mode to welcome the user immediately?
        # User requested "already triggered".
        last_interaction_time = time.time()

    wake_word_detected = False
    clean_command = command
    
    # Check for various spellings of "Jarvis"
    wake_words = ["jarvis", "javis", "travis", "mavis", "davis"] 
    
    # Logic:
    # 1. If explicit wake word is used -> Allowed.
    # 2. If valid interaction happened recently (< 5 mins) -> Allowed (Conversation Mode).
    
    current_time = time.time()
    
    # TIMEOUT LOGIC: Active for 60 seconds after last interaction
    is_active_mode = (current_time - last_interaction_time < 60)
    
    # 1. Explicit Wake Word Check (Always works)
    for w in wake_words:
        if w in command:
            wake_word_detected = True
            # Remove wake word to clean command
            clean_command = command.replace(w, "").replace("hey", "").strip()
            break
            
    # 2. Auto-Active Check (Smart Wake)
    # If we are in the 60s window, we don't need the wake word
    if not wake_word_detected and is_active_mode:
         wake_word_detected = True
         # No need to clean command in conversation mode
         
    if not wake_word_detected:
         # Debug print to help user understand why it's ignored
         # print(f"Ignored (No 'Jarvis' detected and timeout passed): {command}")
         return "continue"
         # No need to clean command in conversation mode
         
    if not wake_word_detected:
         # Debug print to help user understand why it's ignored
         # print(f"Ignored (No 'Jarvis' detected): {command}")
         return "continue"
         
    # Update interaction time because we are processing a command now
    # only if we aren't going to sleep
    last_interaction_time = current_time
    
    command = clean_command
    # -----------------------
    
    # --- 0. Clean Command ---
    # Remove conversational filler prefix
    for clean_start in ["can you", "please", "could you", "would you", "hey", "jarvis", "zeta"]:
        if command.startswith(clean_start):
            command = command.replace(clean_start, "").strip()

    # --- 1. System Commands ---
    if any(k in command for k in ["exit", "quit", "shutdown", "terminate", "code 999", "999"]):
        speak("Goodbye!")
        return "exit"
    
    if "stop" in command:
        # User just wanted to barge-in/silence. 
        # Speech already stopped by listen_loop.
        # Just ack or do nothing.
        return "continue"

    # --- 1.5 Emotion-Based Music & Actions ---
    if "play music" in command or "play songs" in command:
        if current_emotion == "sad":
             speak("I see you are feeling down. Playing something to match your mood.")
             webbrowser.open("https://www.youtube.com/watch?v=hLQl3WQQoQ0") # Sad song (Adele - Someone Like You example)
        else:
             speak("Playing some upbeat music for you!")
             webbrowser.open("https://www.youtube.com/watch?v=09R8_2nJtjg") # Happy/Upbeat (Sugar - Maroon 5 example)
        return "continue"
        
    # --- 2. Dynamic App Opening ---
    if "open" in command:
        # Split by "open" and take the last part
        # e.g. "can you open notepad" -> ["can you ", " notepad"]
        parts = command.split("open")
        if len(parts) > 1:
            app_name = parts[-1].strip()
        else:
            app_name = command.replace("open", "").strip()
            
        if app_name and len(app_name) > 1: # Avoid "HIV is open" -> ""
            speak(f"Opening {app_name}")
            if open_app:
                try:
                    open_app(app_name, match_closest=True, output=False) 
                except:
                    webbrowser.open(f"https://www.google.com/search?q={app_name}")
            else:
                speak("I cannot open apps right now.")
            return "continue" # Return only if we actually tried to open something

    # --- 3. Knowledge / Wikipedia ---
    if "who is" in command or "what is" in command or "tell me about" in command:
        # Exclude vision-related queries
        vision_keywords = ["in my hand", "this", "in front", "holding", "see"]
        if any(keyword in command for keyword in vision_keywords):
            # Skip to next command handler (will be caught by YOLO commands below)
            pass
        else:
            query = command.replace("who is", "").replace("what is", "").replace("tell me about", "").strip()
            if wikipedia and query:
                try:
                    speak(f"Searching for {query}...")
                    results = wikipedia.summary(query, sentences=2)
                    speak(results)
                except wikipedia.exceptions.DisambiguationError:
                    speak("There are multiple results for that. Be more specific.")
                except wikipedia.exceptions.PageError:
                    speak("I couldn't find anything on that.")
                except Exception as e:
                    # speak("Something went wrong with the search.")
                    pass
            return "continue"

    # --- 4. Basic Time/Date ---
    if "time" in command:
        now = datetime.datetime.now().strftime("%I:%M %p")
        speak(f"The time is {now}")
        return "continue"
    elif "date" in command:
        today = datetime.datetime.now().strftime("%B %d, %Y")
        speak(f"Today's date is {today}")
        return "continue"
    
    # --- 5. Web Search (Explicit) ---
    # --- 5. Web Search & Data Retrieval ---
    if "my ip" in command or "my internet address" in command:
        ip = get_public_ip()
        if ip:
            speak(f"Your public IP address is {ip}")
        else:
            speak("I couldn't enable your IP address retrieval.")
        return "continue"

    if "search web for" in command or "search online for" in command:
        query = command.replace("search web for", "").replace("search online for", "").strip()
        
        # Clean specific conversational filler from query (Garbage In/Garbage Out fix)
        # e.g. "search web for i want you to find ranking of..." -> "ranking of..."
        cleanup_phrases = ["i want you to", "can you", "please", "find", "ranking of"]
        for phrase in cleanup_phrases:
            # Only remove if it's at the start to avoid destroying context? 
            # Actually user query is usually "search for X", so if they say "search for i want you to find X", we want "X".
             query = query.replace(phrase, "")
             
        query = query.strip()
        speak(f"Searching the web for {query}...")
        summary = search_web(query)
        speak(summary)
        return "continue"

    if "current events" in command:
        speak("Checking the latest news...")
        summary = search_web("latest current events news world")
        speak(summary)
        return "continue"

    # Legacy Google Search (Only if explicitly asked to 'google' or 'open google')
    if "google" in command:
        query = command.replace("google", "").replace("search", "").replace("for", "").strip()
        speak(f"Opening Google for {query}")
        webbrowser.open(f"https://www.google.com/search?q={query}")
        return "continue"
    
    # --- 6. Location & Reminders ---
    if "organize" in command and "downloads" in command:
        organize_files()
        return "continue"
    
    if "clean" in command and "temp" in command:
        clean_temp_files()
        return "continue"

    
    # --- YOLO Vision Commands (MUST come before web search) ---
    # Check for "in my hand" or "in hand" FIRST (most specific)
    if ("in my hand" in command or "in hand" in command or 
        "what am i holding" in command or "what's in my hand" in command or
        ("what is" in command and "this" in command)):
        try:
            from yolo_detector import get_detector
            import shared_state
            
            frame = shared_state.latest_frame
            
            if frame is not None:
                detector = get_detector()
                center_object, color = detector.get_center_object(frame)
                
                if center_object:
                    if color and color != "unknown":
                        speak(f"That looks like a {color} {center_object}.")
                    else:
                        speak(f"That looks like a {center_object}.")
                else:
                    speak("I don't see anything clearly in front of me.")
            else:
                speak("I couldn't access the camera.")
        except Exception as e:
            print(f"Vision Error: {e}")
            import traceback
            traceback.print_exc()
            speak("I'm having trouble with my vision right now.")
        return "continue"
    
    if "what objects" in command or "list objects" in command:
        try:
            from yolo_detector import get_detector
            import shared_state
            
            frame = shared_state.latest_frame
            
            if frame is not None:
                detector = get_detector()
                object_names = detector.get_object_names(frame)
                
                if object_names:
                    items = ", ".join(object_names)
                    speak(f"I can detect: {items}.")
                else:
                    speak("I don't see any objects.")
            else:
                speak("I couldn't access the camera.")
        except Exception as e:
            print(f"Vision Error: {e}")
            speak("I'm having trouble with my vision right now.")
        return "continue"
    
    if "what do you see" in command or "look at this" in command or "identify" in command:
        see_environment()
        return "continue"
    
    if "where am i" in command or "my location" in command:
        loc = get_location()
        if loc:
            speak(f"You are currently in {loc}")
        else:
            speak("I couldn't determine your location.")
        return "continue"

    if "weather" in command:
        # Extract city if possible e.g. "weather in London"
        city = ""
        if "in" in command:
            city = command.split("in")[-1].strip()
        
        speak(get_weather(city))
        return "continue"

    if "system status" in command or "cpu" in command or "battery" in command:
        speak(get_system_status())
        return "continue"

    if "screenshot" in command or "volume" in command or "mute" in command:
        system_control(command)
        return "continue"

    if "remind me" in command or "set a reminder" in command:
        set_reminder(command)
        return "continue"

    # --- 7. Context / Memory Queries ---
    if "what did i say" in command or "repeat me" in command:
        if conversation_history:
            last_user_text = conversation_history[-1][0]
            speak(f"You just said: {last_user_text}")
        else:
            speak("I don't remember you saying anything before this.")
        return "continue"

        return "continue"

    # --- 8. Voice Switching ---
    # --- 8. Voice Switching ---
    if "change voice" in command or "switch voice" in command or "set voice" in command:
        import re
        
        # Unified regex to find "voice" followed eventually by a number or number-word
        # e.g. "voice 1", "voice number 2", "voice to three", "voice for male (2)"
        
        # Map words to digits
        word_to_digit = {
            "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6",
            "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6"
        }
        
        # Regex: Look for 'voice', then any characters, then a digit or number-word
        # \b ensures we match "one" but not "phone" (though unlikely here)
        match = re.search(r'voice.*?\b(one|two|three|four|five|six|\d)\b', command)
        
        selected_id = None
        selected_name = None
        
        if match:
            captured = match.group(1)
            key = word_to_digit.get(captured)
            if key and key in VOICE_MAP:
                selected_id = VOICE_MAP[key]["id"]
                selected_name = VOICE_MAP[key]["name"]
        
        # Fallback: Check for gender keywords if no specific number found
        if not selected_id:
             if "male" in command or "man" in command:
                 selected_id = VOICE_MAP["2"]["id"] # Christopher
                 selected_name = VOICE_MAP["2"]["name"]
             elif "female" in command or "girl" in command:
                 selected_id = VOICE_MAP["1"]["id"] # Ana
                 selected_name = VOICE_MAP["1"]["name"]
        
        if selected_id:
            current_settings["voice"] = selected_id
            save_settings()
            speak(f"Voice changed to {selected_name}.")
        else:
             # List options
            options = ", ".join([f"{k} for {v['name']}" for k, v in VOICE_MAP.items()])
            speak(f"Please say 'voice' followed by a number. Options are: {options}")
            
        return "continue"

    # --- 9. Conversational Fallback ---
    if command: # Only chat if there is actual text left
        chat(command)
    else:
        # User only said "Jarvis" / "Hey Jarvis"
        speak("Yes? I am listening.")
    return "continue"

try:
    import ollama
except ImportError:
    ollama = None
    print("Warning: ollama python lib not installed. Intelligence limited.")

def chat(text):
    """
    Advanced conversational capability using Ollama (Llama 3.2).
    Uses STREAMING for faster response times.
    """
    global conversation_history
    
    if not ollama:
        speak("I cannot think right now because my brain library is missing.")
        return

    # Construct prompt from history
    messages = []
    # Add system personality
    messages.append({
        'role': 'system', 
        'content': 'You are Jarvis, a helpful, witty, and slightly flirty AI assistant. You are NOT a robot. You are a "cute real human girl" personality. In EVERY response, you MUST use human emotions. Start sentences with fillers like "Hmm...", "Well...", "Oh!". Use action markers frequently: *laughs*, *giggles*, *sighs*, *clears throat*, *hums*. Be expressive and dynamic.'
    })
    
    # Add history
    for user_text, bot_text in conversation_history:
        messages.append({'role': 'user', 'content': user_text})
        messages.append({'role': 'assistant', 'content': bot_text})
        
    # Add current input
    messages.append({'role': 'user', 'content': text})
    
    full_response = ""
    buffer = ""
    
    try:
        print("Thinking (Streaming)...")
        # Generate response WITH STREAMING
        stream = ollama.chat(model='llama3.2', messages=messages, stream=True)
        
        for chunk in stream:
            content = chunk['message']['content']
            full_response += content
            buffer += content
            
            # Use punctuation to identify sentence breaks for smoother speech
            # Split by . ! ? or newline
            if any(punct in buffer for punct in [". ", "? ", "! ", ".\n", "?\n", "!\n"]):
                # Find the split point
                import re
                # Split but keep the delimiter
                parts = re.split(r'([.?!]\s+)', buffer)
                
                # If we have a complete sentence part
                if len(parts) > 1:
                     # part[0] is text, part[1] is delimiter, part[2] is remainder
                    candidate = parts[0] + parts[1]
                    
                    # Optimization: Don't speak very short fragments alone unless end of stream
                    # e.g. "Oh! " might be too short and start/stop feels choppy.
                    # Combine if short.
                    MIN_LENGTH = 20
                    if len(candidate) < MIN_LENGTH and len(parts[2]) > 0:
                        # Too short, keep in buffer? 
                        # Actually, keeping it in buffer is simple: just don't split yet.
                        # But parts[2] is remainder.
                        # We must reconstruct buffer to be candidate + remainder and wait for more?
                        # No, simpler logic:
                        # Only split if the accumulated sentence is substantial OR it's a strong delimiter.
                        pass # For now, let's just emit. The Dual Thread pipeline handles gaps well.
                    
                    speak(candidate) # Send to queue immediately
                    
                    # Keep remainder in buffer
                    buffer = "".join(parts[2:])

        # Speak any remaining text in buffer
        if buffer.strip():
            speak(buffer)
        
        # Update history
        conversation_history.append((text, full_response))
        if len(conversation_history) > MAX_HISTORY:
            conversation_history.pop(0)
            
    except Exception as e:
        print(f"Ollama Error: {e}")
        speak("I am having trouble thinking. Please ensure Ollama is running.")
