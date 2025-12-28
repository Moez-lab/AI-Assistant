"""
YOLO Object Detection Module for Jarvis AI Assistant
Provides real-time object detection using YOLOv8
"""

import cv2
import numpy as np
from ultralytics import YOLO
import threading
import time

class YOLODetector:
    def __init__(self, model_name='yolov8n.pt', confidence_threshold=0.5):
        """
        Initialize YOLO detector
        
        Args:
            model_name: YOLO model to use (yolov8n.pt is fastest)
            confidence_threshold: Minimum confidence for detections (0-1)
        """
        print(f"Loading YOLO model: {model_name}...")
        self.model = YOLO(model_name)
        self.confidence_threshold = confidence_threshold
        self.last_detections = []
        self.detection_lock = threading.Lock()
        print("✓ YOLO model loaded successfully!")
    
    def detect_objects(self, frame):
        """
        Detect objects in a frame
        
        Args:
            frame: OpenCV image (BGR format)
            
        Returns:
            list: List of detected objects with format:
                  [{'name': 'person', 'confidence': 0.95, 'bbox': [x1, y1, x2, y2]}, ...]
        """
        if frame is None:
            return []
        
        try:
            # Run YOLO detection
            results = self.model(frame, verbose=False)
            
            detections = []
            
            # Process results
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    # Get confidence
                    conf = float(box.conf[0])
                    
                    # Filter by confidence threshold
                    if conf >= self.confidence_threshold:
                        # Get class name
                        cls_id = int(box.cls[0])
                        class_name = self.model.names[cls_id]
                        
                        # Get bounding box coordinates
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        
                        detections.append({
                            'name': class_name,
                            'confidence': conf,
                            'bbox': [int(x1), int(y1), int(x2), int(y2)]
                        })
            
            # Store detections thread-safely
            with self.detection_lock:
                self.last_detections = detections
            
            return detections
            
        except Exception as e:
            print(f"YOLO Detection Error: {e}")
            return []
    
    def get_object_names(self, frame=None):
        """
        Get list of detected object names
        
        Args:
            frame: Optional frame to detect in. If None, returns last detections.
            
        Returns:
            list: List of object names (strings)
        """
        if frame is not None:
            detections = self.detect_objects(frame)
        else:
            with self.detection_lock:
                detections = self.last_detections
        
        # Get unique object names
        object_names = list(set([d['name'] for d in detections]))
        return object_names
    
    def get_dominant_color(self, frame, bbox):
        """
        Get the dominant color of an object within its bounding box
        
        Args:
            frame: OpenCV image
            bbox: Bounding box [x1, y1, x2, y2]
            
        Returns:
            str: Color name (e.g., "red", "blue", "green")
        """
        x1, y1, x2, y2 = bbox
        
        # Extract region of interest
        roi = frame[y1:y2, x1:x2]
        
        if roi.size == 0:
            return "unknown"
        
        # Convert to HSV for better color detection
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        
        # Get average hue, saturation, and value
        avg_hue = np.mean(hsv[:, :, 0])
        avg_sat = np.mean(hsv[:, :, 1])
        avg_val = np.mean(hsv[:, :, 2])
        
        # Debug output
        print(f"Color Debug - H:{avg_hue:.1f} S:{avg_sat:.1f} V:{avg_val:.1f}")
        
        # Determine color based on hue, saturation, and value
        # Low saturation = grayscale (black/white/gray)
        if avg_sat < 40:  # Increased threshold for better grayscale detection
            if avg_val < 70:  # Darker threshold for black
                return "black"
            elif avg_val > 180:  # Lighter threshold for white
                return "white"
            else:
                return "gray"
        
        # Very low saturation but some color = likely dark colored object
        if avg_sat < 60 and avg_val < 100:
            return "black"  # Dark objects with slight color tint
        
        # Color detection based on hue (only if saturation is significant)
        if avg_hue < 10 or avg_hue > 165:
            return "red"
        elif avg_hue < 22:
            return "orange"
        elif avg_hue < 38:
            return "yellow"
        elif avg_hue < 85:
            return "green"
        elif avg_hue < 125:
            return "blue"
        elif avg_hue < 155:
            return "purple"
        else:
            return "pink"
    
    def get_center_object(self, frame):
        """
        Get the object closest to the center of the frame with its color
        Useful for "what is this?" or "what is in my hand?" queries
        
        Args:
            frame: OpenCV image
            
        Returns:
            tuple: (object_name, color) or (None, None) if nothing detected
        """
        detections = self.detect_objects(frame)
        
        if not detections:
            return None, None
        
        # Get frame center
        h, w = frame.shape[:2]
        center_x, center_y = w // 2, h // 2
        
        # Find object closest to center
        min_distance = float('inf')
        center_object = None
        center_bbox = None
        
        for det in detections:
            # Get bbox center
            x1, y1, x2, y2 = det['bbox']
            obj_center_x = (x1 + x2) // 2
            obj_center_y = (y1 + y2) // 2
            
            # Calculate distance to frame center
            distance = np.sqrt((obj_center_x - center_x)**2 + (obj_center_y - center_y)**2)
            
            if distance < min_distance:
                min_distance = distance
                center_object = det['name']
                center_bbox = det['bbox']
        
        # Get color of center object
        if center_object and center_bbox:
            color = self.get_dominant_color(frame, center_bbox)
            return center_object, color
        
        return None, None
    
    def draw_detections(self, frame, detections=None):
        """
        Draw bounding boxes and labels on frame
        
        Args:
            frame: OpenCV image
            detections: Optional list of detections. If None, uses last detections.
            
        Returns:
            frame: Annotated frame
        """
        if detections is None:
            with self.detection_lock:
                detections = self.last_detections
        
        annotated_frame = frame.copy()
        
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            name = det['name']
            conf = det['confidence']
            
            # Draw bounding box
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Draw label
            label = f"{name} {conf:.2f}"
            cv2.putText(annotated_frame, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        return annotated_frame
    
    def get_detection_summary(self, frame=None):
        """
        Get a natural language summary of detected objects
        
        Args:
            frame: Optional frame to detect in
            
        Returns:
            str: Human-readable summary
        """
        if frame is not None:
            detections = self.detect_objects(frame)
        else:
            with self.detection_lock:
                detections = self.last_detections
        
        if not detections:
            return "I don't see any objects."
        
        # Count objects
        object_counts = {}
        for det in detections:
            name = det['name']
            object_counts[name] = object_counts.get(name, 0) + 1
        
        # Build summary
        items = []
        for name, count in object_counts.items():
            if count == 1:
                items.append(f"a {name}")
            else:
                items.append(f"{count} {name}s")
        
        if len(items) == 1:
            return f"I can see {items[0]}."
        elif len(items) == 2:
            return f"I can see {items[0]} and {items[1]}."
        else:
            return f"I can see {', '.join(items[:-1])}, and {items[-1]}."


# Global detector instance (initialized when needed)
_detector = None

def get_detector():
    """Get or create global YOLO detector instance"""
    global _detector
    if _detector is None:
        _detector = YOLODetector()
    return _detector
