import ai_assistant
import json
import os
import time
import datetime

# Mock speak
def mock_speak(text):
    print(f"[MOCK SPEAK] {text}")
ai_assistant.speak = mock_speak

print("--- Testing Reminder Logic ---")

# Test 1: "remind me earbuds on 9:47"
print("\n1. Testing 'remind me earbuds on 9:47'...")
cmd = "remind me earbuds on 9:47"

# We perform the file op, so let's clear it first
if os.path.exists("reminders.json"):
    os.remove("reminders.json")

ai_assistant.set_reminder(cmd)

# Test 2: "remind me airport at 9:53 p.m. today"
print("\n2. Testing 'remind me airport at 9:53 p.m. today'...")
cmd2 = "remind me airport at 9:53 p.m. today"
ai_assistant.set_reminder(cmd2)

if os.path.exists("reminders.json"):
    with open("reminders.json", "r") as f:
        data = json.load(f)
        if len(data) > 0:
            print(f"PASS: {len(data)} reminders saved.")
            for i, r in enumerate(data):
                print(f"  Reminder {i+1}: '{r['message']}' at {datetime.datetime.fromtimestamp(r['timestamp'])}")
        else:
            print("FAIL: File created but empty.")
else:
    print("FAIL: reminders.json not created.")

print("\n--- Test Complete ---")
