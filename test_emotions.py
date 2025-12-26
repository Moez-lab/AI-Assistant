import ai_assistant
import time
import queue

# Restore original speak function if it was mocked (reloading module would be cleaner but this works for simple script)
# We won't mock speak. We will mock the queue it puts into.

# Mock the queue
ai_assistant.tts_text_queue = queue.Queue()

# Mock browser
ai_assistant.webbrowser.open = lambda url: print(f"[MOCK BROWSER]: {url}")

print("--- Testing Emotion Queue ---")
# 1. Test Smoothing
print("Injecting 5 'Neutral' and 1 'Angry'")
for _ in range(5): ai_assistant.update_emotion("Neutral")
ai_assistant.update_emotion("Angry")
print(f"Current Emotion (Should be Neutral): {ai_assistant.current_emotion}")

print("\nInjecting 10 'Angry' to shift state")
for _ in range(10): ai_assistant.update_emotion("Angry")
print(f"Current Emotion (Should be Angry): {ai_assistant.current_emotion}")

print("\n--- Testing Adaptive Speech ---")
long_text = "This is a very long sentence that would normally be spoken fully but since I am angry I should cut it short."
print(f"Calling speak with: '{long_text}'")
ai_assistant.speak(long_text) 

# Check what got put in queue
try:
    item = ai_assistant.tts_text_queue.get(timeout=1)
    text_in_queue = item["text"]
    print(f"[QUEUE OUT]: {text_in_queue}")
    if "I am sorry" in text_in_queue:
        print("PASS: Text was truncated/changed for Angry emotion.")
    else:
        print("FAIL: Text was NOT changed.")
except queue.Empty:
    print("FAIL: Nothing in queue.")

print("\n--- Testing Music Logic ---")
# Current is Angry -> Should be Upbeat
ai_assistant.process_command("play music")

print("\n--- Testing Sad State ---")
for _ in range(10): ai_assistant.update_emotion("Sad")
print(f"Current Emotion (Should be Sad): {ai_assistant.current_emotion}")
ai_assistant.process_command("play music")
