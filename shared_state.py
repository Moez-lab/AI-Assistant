"""
Shared state module for Jarvis AI Assistant
Avoids circular imports between setup.py and ai_assistant.py
"""

# Shared camera frame for YOLO detection
latest_frame = None
