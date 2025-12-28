import ai_assistant
import time
import queue
import threading
import asyncio
import websockets
import json
import pygame

# Mock Pygame
def mock_load(file): print("[MOCK PYGAME] Loading audio")
def mock_play(): print("[MOCK PYGAME] Playing audio")
busy_counter = 5
def mock_get_busy():
    global busy_counter
    if busy_counter > 0:
        busy_counter -= 1
        return True
    return False

if not pygame.mixer.get_init():
    pygame.mixer.init()

pygame.mixer.music.load = mock_load
pygame.mixer.music.play = mock_play
pygame.mixer.music.get_busy = mock_get_busy

# Setup Mock queues
ai_assistant.tts_text_queue = queue.Queue()
ai_assistant.webbrowser.open = lambda url: print(f"[MOCK BROWSER]: {url}")

print("Waiting for Avatar Server to initialize...")
time.sleep(2) 

received_messages = []
client_ready = threading.Event()

async def test_client():
    uri = "ws://localhost:8765"
    async with websockets.connect(uri) as websocket:
        print("[TEST CLIENT] Connected")
        client_ready.set() # Signal main thread
        try:
            while True:
                msg = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                print(f"[TEST CLIENT] Received: {msg}")
                received_messages.append(json.loads(msg))
        except asyncio.TimeoutError:
            print("[TEST CLIENT] Timeout (No more messages)")
        except Exception as e:
            print(f"[TEST CLIENT] Error: {e}")

def run_client():
    asyncio.run(test_client())

client_thread = threading.Thread(target=run_client, daemon=True)
client_thread.start()

print("Waiting for client to connect...")
client_ready.wait(timeout=5)
if not client_ready.is_set():
    print("FAIL: Client never connected (Server might not be running)")
    exit(1)

time.sleep(1) # Extra buffer

print("\n--- Triggering Speech ---")
print("Injecting fake audio...")
ai_assistant.tts_audio_queue.put({"audio": b"fake_audio_bytes", "id": ai_assistant.playback_generation_id})

time.sleep(3) 

print("\n--- Verifying Messages ---")
found_start = any(m["type"] == "speak_start" for m in received_messages)
found_stop = any(m["type"] == "speak_stop" for m in received_messages)

if found_start and found_stop:
    print("PASS: Received speak_start and speak_stop events.")
else:
    print(f"FAIL: Messages received: {received_messages}")

print("Done.")
