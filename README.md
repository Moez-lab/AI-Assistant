# J.A.R.V.I.S. AI Assistant - "The Upgrade"

Welcome to your advanced **Hybrid AI Assistant**! This system combines a powerful Python backend with a stunning 3D React frontend to create a futuristic, interactive assistant.

## 🧠 System Architecture

This project runs on a **parallel multi-threaded architecture**:

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Core Logic** | Python 3.10+ | Central brain handling decision making |
| **Vision** | **YOLOv8** + **FaceNet** | Object Detection & Face Recognition |
| **Interface** | **React** + **Three.js** | 3D Holographic Avatar & HUD |
| **Voice** | **Edge TTS** | High-quality neural voice synthesis |
| **Communication**| **WebSockets** (Port 8765) | Real-time sync between Brain & Avatar |
| **Search** | **Selenium** | Automated Product Search (Google Lens) |

---

## 🚀 How to Start

### 1. Launch the Backend (The Brain)
Open a terminal in the root folder and run:
```bash
python setup.py
```
*This starts the Camera, Voice Listener, HUD, and WebSocket Server.*

### 2. Launch the Frontend (The Face)
Open a new terminal in the `web_interface/` folder:
```bash
cd web_interface
npm run dev
```
*This activates the 3D Avatar at `http://localhost:5173`.*

---

## 🤖 Features & Commands

### 👁️ Computer Vision (YOLOv8 & DeepFace)
The "Eyes" of the system.
- **Identify Objects:** *"What do you see?"* or *"Look at this."*
- **Product Search (Selenium):** *"What model is this?"* or *"Search this product."*
- **Sentry Mode:** Automatically flashes **RED** HUD if an unknown face is detected for >5 seconds.

### 🗣️ Voice & Lip Sync
The "Mouth" of the system.
- **Lip Sync:** The 3D Avatar's lips move in perfect synchronization with the voice using **Asyncio** & **WebSockets**.
- **Barge-In:** You can interrupt the assistant while she is speaking.

### 💻 Desktop Automation
The "Hands" of the system.
- **App Control:** *"Open Chrome"*, *"Open Spotify"*.
- **Organization:** *"Organize downloads"* (Sorts files into folders).
- **Maintenance:** *"Clean temp files"* (Clears system cache).
- **System Control:** *"Take a screenshot"*, *"Volume up/down"*.

### 🌐 Smart Knowledge
- **General Info:** *"Who is Elon Musk?"*, *"Tell me about Quantum Physics."*
- **Real-Time Info:** *"What is the weather in London?"*
- **Status:** *"System status"* (Shows CPU/RAM/Battery usage).

---

## 🛠️ Troubleshooting

### Vision Issues?
- If "What do you see" fails, ensure `yolo_detector.py` is working.
- **Note:** `vision_utils.py` (MobileNet SSD) is legacy code and is not currently used.

### Avatar Not Moving?
- Ensure both the **Python Server** and **React App** are running.
- Check if the WebSocket server says *"Avatar Server running on ws://localhost:8765"*.

### Audio Issues?
- If she interrupts herself, the microphone sensitivity might be too high. Adjust `r.energy_threshold` in `ai_assistant.py` if needed.
