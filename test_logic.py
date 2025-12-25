import ai_assistant
import time
import asyncio

# Mocking external dependencies to test logic flow
def mock_speak(text):
    print(f"[SPEAK] {text}")

# We want to test the REAL speak function for memory errors, 
# but we might not have a valid edge_tts or pygame mixer output in this headless/agent env.
# So we will try-catch the real speak.

print("--- Testing Command Logic ---")

# 1. Test STOP (Should return "continue")
print("\n1. Testing 'stop' command...")
result = ai_assistant.process_command("stop")
if result == "continue":
    print("PASS: 'stop' did not exit.")
else:
    print(f"FAIL: 'stop' returned {result}")

# 2. Test EXIT (Should return "exit")
print("\n2. Testing 'exit' command...")
result = ai_assistant.process_command("jarvis exit")
if result == "exit":
    print("PASS: 'jarvis exit' returned exit status.")
else:
    print(f"FAIL: 'exit' returned {result}")

# 3. Test Audio Memory Fix (call speak)
# This checks if the new BytesIO logic throws any 'Permission denied' or other errors.
# Note: This might fail if edge_tts cannot connect or pygame has no audio device, 
# but it shouldn't fail with "Permission denied" on a file.
print("\n3. Testing In-Memory Audio Generation...")
try:
    ai_assistant.speak("Testing audio memory buffer.")
    print("PASS: speak() executed without exception.")
except Exception as e:
    print(f"FAIL/WARNING: speak() threw error: {e}")
    # If it's a mixer error (no device), that's expected in this env, but NOT Permission Error.
    if "Permission denied" in str(e):
        print("CRITICAL FAIL: File permission error still exists!")

print("\n--- Test Complete ---")
