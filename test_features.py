import ai_assistant
import os

print("--- Testing Automation Features ---")

# 1. Test System Status
print("1. Testing System Status...")
print(ai_assistant.get_system_status())

# 2. Test Organize (Dry run - won't fail if empty)
print("\n2. Testing File Organizer...")
ai_assistant.organize_files()

# 3. Test Weather (Network check)
print("\n3. Testing Weather...")
print(ai_assistant.get_weather("London"))

# 4. Test Vision (Requires camera - might fail if busy, but logic check)
print("\n4. Testing Vision Logic...")
try:
    # Hack: Inject vision_utils mock if missing? No, let's try real first
    if ai_assistant.vision_utils:
        print("Vision utils loaded. Models ready.")
        # We won't call see_environment() because it opens camera and blocks.
    else:
        print("Vision utils NOT loaded.")
except:
    print("Vision check failed.")

print("\n--- Test Complete ---")
