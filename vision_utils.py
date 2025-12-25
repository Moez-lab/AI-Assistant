import cv2
import numpy as np

# Load Model (Global to avoid reloading)
net = cv2.dnn.readNetFromCaffe("MobileNetSSD_deploy.prototxt", "MobileNetSSD_deploy.caffemodel")

CLASSES = ["background", "aeroplane", "bicycle", "bird", "boat",
	"bottle", "bus", "car", "cat", "chair", "cow", "diningtable",
	"dog", "horse", "motorbike", "person", "pottedplant", "sheep",
	"sofa", "train", "monitor"]

def detect_objects_in_frame(frame):
    """
    Returns a list of detected objects in the frame.
    """
    (h, w) = frame.shape[:2]
    # Resize to 300x300 for MobileNet
    blob = cv2.dnn.blobFromImage(cv2.resize(frame, (300, 300)), 0.007843, (300, 300), 127.5)
    net.setInput(blob)
    detections = net.forward()

    found_objects = []
    
    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]
        if confidence > 0.5: # 50% threshold
            idx = int(detections[0, 0, i, 1])
            if idx < len(CLASSES):
                label = CLASSES[idx]
                found_objects.append(label)
                
    # Remove duplicates and return unique list
    return list(set(found_objects))
