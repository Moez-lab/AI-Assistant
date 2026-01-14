import json

model_path = r"c:\Users\mueez\OneDrive\Desktop\assignment\web_interface\public\models\north\scene.gltf"

def search_keys(data, path=""):
    if isinstance(data, dict):
        for k, v in data.items():
            new_path = f"{path}.{k}" if path else k
            if k == "targets":
                print(f"FOUND 'targets' at {new_path}. Length: {len(v)}")
            
            # Recursive check
            if isinstance(v, (dict, list)):
                 search_keys(v, new_path)
    elif isinstance(data, list):
        for i, item in enumerate(data):
            search_keys(item, f"{path}[{i}]")

try:
    with open(model_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print("--- Searching Keys ---")
    search_keys(data)
    print("--- End Search ---")
except Exception as e:
    print(f"Error: {e}")
