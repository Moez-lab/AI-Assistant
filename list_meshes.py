import json

model_path = r"c:\Users\mueez\OneDrive\Desktop\assignment\web_interface\public\models\north\scene.gltf"

try:
    with open(model_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print("--- Meshes ---")
    if 'meshes' in data:
        for i, mesh in enumerate(data['meshes']):
            name = mesh.get('name', f"Mesh_{i}")
            print(f"{i}: {name}")
    else:
        print("No meshes found.")

except Exception as e:
    print(f"Error: {e}")
