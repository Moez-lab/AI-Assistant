import json

model_path = r"c:\Users\mueez\OneDrive\Desktop\assignment\web_interface\public\models\north\scene.gltf"

try:
    with open(model_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print("--- Nodes ---")
    if 'nodes' in data:
        for i, node in enumerate(data['nodes']):
            name = node.get('name', f"Node_{i}")
            if "jaw" in name.lower() or "lip" in name.lower() or "mouth" in name.lower() or "head" in name.lower():
                 print(f"{i}: {name}")
    else:
        print("No nodes found.")

except Exception as e:
    print(f"Error: {e}")
