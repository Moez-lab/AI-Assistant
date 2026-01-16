const fs = require('fs');
const path = require('path');

const gltfPath = path.join('c:/Users/mueez/OneDrive/Desktop/assignment/web_interface/public/models/sexy_girl/scene.gltf');

try {
    const data = fs.readFileSync(gltfPath, 'utf8');
    const gltf = JSON.parse(data);

    console.log("Analyzing GLTF for Node Names...");

    // List ALL nodes and their meshes/morphs
    console.log("--- NODE - MESH - MORPH MAP ---");
    gltf.nodes.forEach((node, idx) => {
        if (node.mesh !== undefined) {
            const mesh = gltf.meshes[node.mesh];
            const morphCount = mesh.primitives[0].targets ? mesh.primitives[0].targets.length : 0;
            // Check for targetNames
            let names = "N/A";
            if (mesh.extras && mesh.extras.targetNames) names = mesh.extras.targetNames;
            if (mesh.primitives[0].extras && mesh.primitives[0].extras.targetNames) names = mesh.primitives[0].extras.targetNames;

            if (morphCount > 0) {
                console.log(`Node: ${node.name || 'Unnamed'} (Idx: ${idx}) -> Mesh: ${mesh.name} (Idx: ${node.mesh}) -> Morphs: ${morphCount}`);
                // console.log(`   Target Names: ${JSON.stringify(names)}`);
            }
        }
    });

} catch (err) {
    console.error("Error reading file:", err);
}
