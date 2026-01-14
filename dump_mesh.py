import json

model_path = r"c:\Users\mueez\OneDrive\Desktop\assignment\web_interface\public\models\north\scene.gltf"

try:
    with open(model_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if 'meshes' in data and len(data['meshes']) > 4:
        mesh = data['meshes'][4]
        print(json.dumps(mesh, indent=2))
    else:
        print("Mesh 4 not found.")

except Exception as e:
    print(f"Error: {e}")
