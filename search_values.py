import json

model_path = r"c:\Users\mueez\OneDrive\Desktop\assignment\web_interface\public\models\north\scene.gltf"

def search_values(data, path=""):
    if isinstance(data, dict):
        for k, v in data.items():
            new_path = f"{path}.{k}" if path else k
            if isinstance(v, str):
                if "blink" in v.lower() or "mouth" in v.lower() or "smile" in v.lower():
                    print(f"FOUND string match at {new_path}: {v}")
            search_values(v, new_path)
    elif isinstance(data, list):
        for i, item in enumerate(data):
            search_values(item, f"{path}[{i}]")

try:
    with open(model_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print("--- Searching Values ---")
    search_values(data)
    print("--- End Search ---")
except Exception as e:
    print(f"Error: {e}")
