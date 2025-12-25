# J.A.R.V.I.S. AI Assistant - "The Upgrade"

Welcome to your advanced AI Assistant! This system has been upgraded with **Sentry Security**, **Emotion Intelligence**, **Computer Vision**, and **Desktop Automation**.

## 🚀 How to Start
1.  **Run the System**:
    ```bash
    python setup.py
    ```
2.  **The HUD**: You will see a Sci-Fi "Head-Up Display" with live system stats (CPU/RAM/Battery) and face tracking.

## 🛡️ Sentry Mode (Security)
Your assistant protects your PC when you are away.
-   **Trigger**: If an **UNKNOWN** face is detected for more than 5 seconds.
-   **Reaction**: 
    -   HUD flashes **RED**.
    -   "INTRUDER DETECTED" warning appears.
    -   (Future: Takes a photo / Plays alarm).

## 🧠 Smart Features (New!)

### 1. Emotion & Personality
She adapts to *YOU*.
-   **Emotion Detection**: The HUD displays your current emotion (Happy, Sad, Angry, Neutral).
-   **Reaction**: She changes her tone and the HUD colors change to match your mood (Yellow=Happy, Grey=Sad).

### 2. Computer Vision ("The Eyes")
She can see the real world, not just faces.
-   **Say**: *"What do you see?"*
-   **Say**: *"Look at this."*
-   **Result**: She will list objects in front of the camera (e.g., "I see a person, a cell phone, and a bottle").

### 3. Desktop Automation ("The Secretary")
She keeps your PC organized.
-   **Say**: *"Organize downloads"* -> Sorts files in Downloads into folders (Images, Documents, Installers, etc.).
-   **Say**: *"Clean temp files"* -> Deletes safe-to-remove Windows temporary junk to speed up your PC.

### 4. System Control
Total control over your machine.
-   **Say**: *"Take a screenshot"* (Saves to folder).
-   **Say**: *"Volume up / Volume down / Mute"*.
-   **Say**: *"System status"* (Reads out CPU, Memory, and Battery levels).
-   **Say**: *"What is the weather?"* or *"Weather in [City]"*.

## 🗣️ Core Features
*   **Conversation**: "Hello", "How are you?", "Who is Elon Musk?"
*   **Reminders**: "Remind me to call mom in 10 minutes."
*   **Apps**: "Open Chrome", "Open Spotify".
*   **Web Search**: "Search for latest tech news."

## 🔧 Troubleshooting
*   **Vision**: If "What do you see" fails, ensure `vision_utils.py` and the `MobileNet` models are in the folder.
*   **Audio**: If she is interrupting herself, adjust the microphone sensitivity or use headphones (Barge-in feature).
