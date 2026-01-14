import json

model_path = r"c:\Users\mueez\OneDrive\Desktop\assignment\web_interface\public\models\north\scene.gltf"

def recursive_search(data, path=""):
    if isinstance(data, dict):
        for k, v in data.items():
            new_path = f"{path}.{k}" if path else k
            if k == "targetNames":
                print(f"FOUND targetNames at {new_path}: {v}")
            # Also check for mesh names that look like head
            if k == "name" and isinstance(v, str) and "head" in v.lower():
                print(f"Potential Head Mesh at {path}: {v}")
            
            recursive_search(v, new_path)
    elif isinstance(data, list):
        for i, item in enumerate(data):
            recursive_search(item, f"{path}[{i}]")

try:
    with open(model_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print("--- Starting Deep Search ---")
    recursive_search(data)
    print("--- End Search ---")
except Exception as e:
    print(f"Error: {e}")
