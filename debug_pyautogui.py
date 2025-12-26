import sys
print(f"Python Executable: {sys.executable}")
try:
    import pyautogui
    print("PyAutoGUI imported successfully!")
    print(f"PyAutoGUI location: {pyautogui.__file__}")
except Exception as e:
    print(f"Failed to import PyAutoGUI: {e}")
    import traceback
    traceback.print_exc()
