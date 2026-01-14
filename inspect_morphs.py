import json
import os

model_path = r"c:\Users\mueez\OneDrive\Desktop\assignment\web_interface\public\models\north\scene.gltf"

try:
    with open(model_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print("--- Morph Targets Found ---")
    if 'meshes' in data:
        for i, mesh in enumerate(data['meshes']):
            name = mesh.get('name', f"Mesh_{i}")
            primitives = mesh.get('primitives', [])
            for prim in primitives:
                # Check for extras.targetNames (common in some exporters)
                if 'extras' in prim and 'targetNames' in prim['extras']:
                    print(f"\nMesh: {name}")
                    print(f"Targets: {prim['extras']['targetNames']}")
                # Check for extras.targetNames in the mesh itself
                elif 'extras' in mesh and 'targetNames' in mesh['extras']:
                    print(f"\nMesh: {name}")
                    print(f"Targets: {mesh['extras']['targetNames']}")
                # Sometimes it's just 'targetNames' in primitive (non-standard but possible)
                elif 'targetNames' in prim:
                    print(f"\nMesh: {name}")
                    print(f"Targets: {prim['targetNames']}")
                else:
                    # If we can't find names, print count
                    if 'targets' in prim:
                        print(f"\nMesh: {name}")
                        print(f"Has {len(prim['targets'])} targets but no names found in standard locations.")
                        # Check top level 'skins' or 'animations' might hint, but usually names are in extras.
    else:
        print("No meshes found in GLTF.")

except Exception as e:
    print(f"Error: {e}")
