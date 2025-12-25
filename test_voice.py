import ai_assistant
import json
import os

# Mock speak to avoid audio device hangs
def mock_speak(text):
    print(f"[MOCK SPEAK] {text}")
ai_assistant.speak = mock_speak

print("--- Testing Enhanced Voice Switching ---")

# Ensure settings loaded
ai_assistant.load_settings()
print(f"Initial Voice: {ai_assistant.current_settings.get('voice')}")

# Test 1: Switch to Voice 3 (Aria)
print("\n1. Switching to Voice 3 (Aria)...")
ai_assistant.process_command("change voice to 3")

target_id = ai_assistant.VOICE_MAP["3"]["id"]
if ai_assistant.current_settings['voice'] == target_id:
    print(f"PASS: Logic switched to {ai_assistant.VOICE_MAP['3']['name']}")
else:
    print(f"FAIL: Voice is {ai_assistant.current_settings['voice']}, expected {target_id}")

# Test 2: Switch to Voice "Five" (Jenny)
print("\n2. Switching to Voice 'Five' (Jenny)...")
ai_assistant.process_command("set voice five")

target_id = ai_assistant.VOICE_MAP["5"]["id"]
if ai_assistant.current_settings['voice'] == target_id:
    print(f"PASS: Logic switched to {ai_assistant.VOICE_MAP['5']['name']}")
else:
    print(f"FAIL: Voice is {ai_assistant.current_settings['voice']}, expected {target_id}")

# Test 3: Check Settings File Content
print("\n3. Verifying settings.json has voice list...")
with open("settings.json", "r") as f:
    data = json.load(f)
    if "voice_list" in data and "1" in data["voice_list"]:
        print("PASS: settings.json contains voice_list.")
    else:
        print("FAIL: settings.json missing voice_list.")

print("\n--- Test Complete ---")
