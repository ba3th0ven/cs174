import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 10, 20);
controls.target.set(0, 0, 0);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
keyLight.position.set(10, 5, 10);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xcccccc, 0.5);
fillLight.position.set(-10, 5, 10);
scene.add(fillLight);

const backLight = new THREE.DirectionalLight(0xffffff, 0.7);
backLight.position.set(0, 5, -10);
scene.add(backLight);



///// Transformation Matrices /////
function translationMatrix(tx, ty, tz) {
    return new THREE.Matrix4().set(
        1, 0, 0, tx,
        0, 1, 0, ty,
        0, 0, 1, tz,
        0, 0, 0, 1
    );
}

function rotationMatrixX(theta) {
    return new THREE.Matrix4().set(
        1, 0, 0, 0,
        0, Math.cos(theta), -Math.sin(theta), 0,
        0, Math.sin(theta), Math.cos(theta), 0,
        0, 0, 0, 1
    );
}

function rotationMatrixY(theta) {
    return new THREE.Matrix4().set(
        Math.cos(theta), 0, Math.sin(theta), 0,
        0, 1, 0, 0,
        -Math.sin(theta), 0, Math.cos(theta), 0,
        0, 0, 0, 1
    );
}

function rotationMatrixZ(theta) {
    return new THREE.Matrix4().set(
        Math.cos(theta), -Math.sin(theta), 0, 0,
        Math.sin(theta),  Math.cos(theta), 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );
}

function scaleMatrix(sx, sy, sz) {
	return new THREE.Matrix4().set(
		sx, 0, 0, 0,
		0, sy, 0, 0,
		0, 0, sz, 0,
		0, 0, 0, 1
	);
}

//////////////////////////////////

// walls
let walllen = 40;
let wallup = 10;

const wallgeo = new THREE.BoxGeometry( walllen, 0.2, walllen );
const wallmaterial = new THREE.MeshPhongMaterial( { color: 0xbdbabb, ambient: 0.0, diffusivity: 0.5, specularity: 1.0, smoothness: 40.0 } );

const wall_back = new THREE.Mesh( wallgeo, wallmaterial );
const wall_right = new THREE.Mesh( wallgeo, wallmaterial );
const wall_left = new THREE.Mesh( wallgeo, wallmaterial );
scene.add( wall_back, wall_right, wall_left);

let scaley = scaleMatrix(1, 0.6, 1);

let walltx = translationMatrix(0, wallup, -20);
let wall_rotx = rotationMatrixX(Math.PI / 2.0);
let walltransform = new THREE.Matrix4();

// walltransform.multiplyMatrices(wallt, walltransform);
walltransform.multiplyMatrices(wall_rotx, walltransform);
walltransform.multiplyMatrices(walltx, walltransform);
walltransform.multiplyMatrices(scaley, walltransform);

wall_back.applyMatrix4(walltransform);


// right and left walls
let wall_tleft = translationMatrix(-20, wallup, 0);
let wall_tright = translationMatrix(20, wallup, 0);
let wall_rotz = rotationMatrixZ(Math.PI / 2.0);


walltransform = new THREE.Matrix4();
walltransform.multiplyMatrices(wall_rotz, walltransform);
walltransform.multiplyMatrices(wall_tleft, walltransform);
walltransform.multiplyMatrices(scaley, walltransform);

wall_left.applyMatrix4(walltransform);

walltransform = new THREE.Matrix4();
walltransform.multiplyMatrices(wall_rotz, walltransform);
walltransform.multiplyMatrices(wall_tright, walltransform);
walltransform.multiplyMatrices(scaley, walltransform);
wall_right.applyMatrix4(walltransform);

//////////////////////////////////

//////////////////////////////////

// floor
const floorgeo = new THREE.BoxGeometry( 40, 0.2, 40 );
const floormaterial = new THREE.MeshPhongMaterial( { color: 0xbdbabb, ambient: 0.0, diffusivity: 0.5, specularity: 1.0, smoothness: 40.0 } );

const floor = new THREE.Mesh( floorgeo, floormaterial );
scene.add( floor );

let floort = translationMatrix(0, -3, 0);
let floortransform = new THREE.Matrix4();

floortransform.multiplyMatrices(floort, floortransform);
floortransform.multiplyMatrices(floort, floortransform);

floor.applyMatrix4(floortransform);

//////////////////////////////////


//////////////////////////////////

// Operating table
const table_geometry = new THREE.BoxGeometry( 10, 1, 20 );
const table_material = new THREE.MeshPhongMaterial( { color: 0xADD8E6, ambient: 0.0, diffusivity: 0.5, specularity: 1.0, smoothness: 40.0 } );

const table = new THREE.Mesh( table_geometry, table_material );
scene.add( table );

const leg_geometry = new THREE.CylinderGeometry( 0.5, 0.5, 7, 32 );
const leg1 = new THREE.Mesh( leg_geometry, table_material );
const leg2 = new THREE.Mesh( leg_geometry, table_material );
const leg3 = new THREE.Mesh( leg_geometry, table_material );
const leg4 = new THREE.Mesh( leg_geometry, table_material );

leg1.position.set(4.5, -3, -9.5);
leg2.position.set(-4.5, -3, -9.5);
leg3.position.set(4.5, -3, 9.5);
leg4.position.set(-4.5, -3, 9.5);
scene.add( leg1, leg2, leg3, leg4 );

//////////////////////////////////


//////////////////////////////////

// Second smaller table
const table2_geo = new THREE.BoxGeometry( 10, 2, 20 );
const table2_material = new THREE.MeshPhongMaterial( { color: 0x4d6966, ambient: 0.0, diffusivity: 0.5, specularity: 1.0, smoothness: 40.0 } );

const table2 = new THREE.Mesh( table2_geo, table2_material );
scene.add( table2 );

const table2_leg_geometry = new THREE.CylinderGeometry( 0.5, 0.5, 10, 32 );
const table_leg1 = new THREE.Mesh( table2_leg_geometry, table2_material );
const table_leg2 = new THREE.Mesh( table2_leg_geometry, table2_material );
const table_leg3 = new THREE.Mesh( table2_leg_geometry, table2_material );
const table_leg4 = new THREE.Mesh( table2_leg_geometry, table2_material );

table_leg1.position.set(4.5, -5, -9.5);
table_leg2.position.set(-4.5, -5, -9.5);
table_leg3.position.set(4.5, -5, 9.5);
table_leg4.position.set(-4.5, -5, 9.5);
table2.add( table_leg1, table_leg2, table_leg3, table_leg4 );

let tablescale = 0.7;

let tablet = translationMatrix(10, -2, 0);
let tables = scaleMatrix(tablescale, tablescale*0.7, tablescale);
let table_transform = new THREE.Matrix4();

table_transform.multiplyMatrices(tables, table_transform);
table_transform.multiplyMatrices(tablet, table_transform);

table2.applyMatrix4(table_transform);

//////////////////////////////////

let light2 = new THREE.PointLight(0x1f1f1f, 1, 10, 1);
light2.castShadow = true
scene.add(light2);

const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
scene.add(ambientLight);

//////////////////////////////////

// Heart #1 inside of person

// Load heart model
const loader = new OBJLoader();
let heart;

loader.load(
    'models/heart.obj',
    (object) => {
        // Create realistic heart material
        const heartMaterial = new THREE.MeshPhongMaterial({
            color: 0x8B0000,
            specular: 0x111111,
            shininess: 30,
            side: THREE.DoubleSide
        });

        object.traverse((child) => {
            if (child.isMesh) {
                child.material = heartMaterial;
                child.castShadow = true;
                child.receiveShadow = true;

                // Compute normals for proper lighting
                child.geometry.computeVertexNormals();
            }
        });

        heart = object;
        scene.add(heart);

        console.log('Heart loaded successfully!');
        console.log('Vertices:', object.children[0].geometry.attributes.position.count);


        let heartm = translationMatrix(0.2, 1.2, -4.5);
        let heartscale = scaleMatrix(0.7, 0.7, 0.7);
        let heart_transform = new THREE.Matrix4();

        // heart_transform.multiplyMatrices(heartscale, heart_transform);
        heart_transform.multiplyMatrices(heartm, heart_transform);

        object.applyMatrix4(heart_transform)
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('Error loading heart model:', error);
    }
);



//////////////////////////////////


//////////////////////////////////

// Human body model

// Load human body model
let humanbody;

const mtlLoader = new MTLLoader();
// Optional: Set the path to the directory containing the files
// mtlLoader.setPath('.'); 
// mtlLoader.load('humanbody.mtl', function (materials) {
//     materials.preload();

// loader.setMaterials(materials);

loader.load('models/humanbody.obj',(object) => {
        // Create realistic body material
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xe6bc98,
            specular: 0x111111,
            shininess: 50,
            side: THREE.DoubleSide
        });

        object.traverse((child) => {
            if (child.isMesh) {
                child.material = bodyMaterial;
                child.castShadow = true;
                child.receiveShadow = true;

                // Compute normals for proper lighting
                child.geometry.computeVertexNormals();
            }
        });


        humanbody = object;
        scene.add(humanbody);

        let humanscale = 1.3;

        let bodyt = translationMatrix(0, 0, -2);
        let bodys = scaleMatrix(humanscale, humanscale, humanscale);
        let body_transform = new THREE.Matrix4();

        body_transform.multiplyMatrices(bodys, body_transform);
        body_transform.multiplyMatrices(bodyt, body_transform);

        humanbody.applyMatrix4(body_transform)

        console.log('Body loaded successfully!');
        console.log('Vertices:', object.children[0].geometry.attributes.position.count);
    }, (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    }, (error) => {
        console.error('Error loading body model:', error);
    }
);
// });
//////////////////////////////////

let blanket;

loader.load('blanket2.obj',(object) => {
        // Create realistic body material
        const blanketMat = new THREE.MeshPhongMaterial({
            color: 0x89CFFF,
            specular: 0x111111,
            shininess: 10,
            side: THREE.DoubleSide
        });

        object.traverse((child) => {
            if (child.isMesh) {
                child.material = blanketMat;
                child.castShadow = true;
                child.receiveShadow = true;

                // Compute normals for proper lighting
                child.geometry.computeVertexNormals();
            }
        });


        blanket = object;
        scene.add(blanket);

        let blanketscale = 1.3;

        let blankett = translationMatrix(0.0, 0.45, -2.0);
        let blankets = scaleMatrix(blanketscale*0.95, blanketscale*0.95, blanketscale);
        let blanket_transform = new THREE.Matrix4();

        blanket_transform.multiplyMatrices(blankets, blanket_transform);
        blanket_transform.multiplyMatrices(blankett, blanket_transform);

        blanket.applyMatrix4(blanket_transform)

        console.log('Body loaded successfully!');
        console.log('Vertices:', object.children[0].geometry.attributes.position.count);
    }, (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    }, (error) => {
        console.error('Error loading body model:', error);
    }
);
//////////////////////////////////


// Gouraud Shader
function createGouraudMaterial(materialProperties) {   
    const numLights = 1;
    let shape_color_representation = new THREE.Color(materialProperties.color);

    let shape_color = new THREE.Vector4(
        shape_color_representation.r,
        shape_color_representation.g,
        shape_color_representation.b,
        1.0
    ); 
    
    // Vertex Shader
    let vertexShader = `
        precision mediump float;
        const int N_LIGHTS = ${numLights};
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS];
        uniform vec4 light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale;
        uniform vec3 camera_center;
        varying vec4 color;

        vec3 gouraud_shading(vec3 N, vec3 vertex_worldspace) {
            vec3 E = normalize(camera_center - vertex_worldspace);
            vec3 result = shape_color.xyz * ambient; // Ambient term

            for(int i = 0; i < N_LIGHTS; i++) {
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                    light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length(surface_to_light_vector);
                vec3 L = normalize(surface_to_light_vector);
                vec3 R = reflect(-L, N);

                float diffuse = max(dot(N, L), 0.0);
                float specular = pow(max(dot(R, E), 0.0), smoothness);

                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light);
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                        + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        }

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {
            gl_Position = projection_camera_model_transform * vec4(position, 1.0);
            vec3 N_world = normalize(mat3(model_transform) * normal / squared_scale);
            vec3 vertex_worldspace = (model_transform * vec4(position, 1.0)).xyz;
            
            // Compute lighting at each vertex
            vec3 computed_color = gouraud_shading(N_world, vertex_worldspace);
            color = vec4(computed_color, shape_color.w);
        }
    `;

    // Fragment Shader
    let fragmentShader = `
        varying vec4 color;

        void main() {
            gl_FragColor = color;
        }
    `;
    
    // Uniforms
    const uniforms = {
        ambient: { value: materialProperties.ambient },
        diffusivity: { value: materialProperties.diffusivity },
        specularity: { value: materialProperties.specularity },
        smoothness: { value: materialProperties.smoothness },
        shape_color: { value: shape_color },
        squared_scale: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        camera_center: { value: new THREE.Vector3() },
        model_transform: { value: new THREE.Matrix4() },
        projection_camera_model_transform: { value: new THREE.Matrix4() },
        light_positions_or_vectors: { value: [] },
        light_colors: { value: [] },
        light_attenuation_factors: { value: [] }
    };

    // Create the ShaderMaterial using the custom vertex and fragment shaders
    return new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms
    });
}

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

// Handle keyboard input
document.addEventListener('keydown', onKeyDown, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event){
    switch(event.keyCode) {

    }
}

function updateShaderMaterialUniforms(object, camera, scene) {
    const material = object.material;
    if (!material || !material.uniforms) return;

    const uniforms = material.uniforms;

    // User-defined number of lights (stored when material was created)
    const numLights = material.userData.numLights ?? 1;

    const lights = scene.children.filter(c => c.isLight).slice(0, numLights);

    // Update transforms
    object.updateMatrixWorld();
    camera.updateMatrixWorld();

    uniforms.model_transform.value.copy(object.matrixWorld);

    uniforms.projection_camera_model_transform.value
        .copy(camera.projectionMatrix)
        .multiply(camera.matrixWorldInverse)
        .multiply(object.matrixWorld);

    // Camera center
    uniforms.camera_center.value.setFromMatrixPosition(camera.matrixWorld);

    // Squared scale
    const s = object.scale;
    uniforms.squared_scale.value.set(s.x * s.x, s.y * s.y, s.z * s.z);

    // Clear and repopulate light uniforms
    uniforms.light_positions_or_vectors.value = [];
    uniforms.light_colors.value = [];
    uniforms.light_attenuation_factors.value = [];

    for (let i = 0; i < numLights; i++) {
        const light = lights[i];

        if (light) {
            const lpv = new THREE.Vector4();

            if (light.isDirectionalLight) {
                const dir = new THREE.Vector3();
                light.getWorldDirection(dir);
                lpv.set(dir.x, dir.y, dir.z, 0.0);
            } else {
                lpv.set(light.position.x, light.position.y, light.position.z, 1.0);
            }

            uniforms.light_positions_or_vectors.value.push(lpv);

            uniforms.light_colors.value.push(
                new THREE.Vector4(light.color.r, light.color.g, light.color.b, 1.0)
            );

            let attenuation = 0.0;
            if (light.isPointLight) {
                attenuation = 1.0 / Math.max(1.0, light.distance * light.distance);
            }

            attenuation *= light.intensity ?? 1.0;
            uniforms.light_attenuation_factors.value.push(attenuation);

        } else {
            // Default / missing light padding
            uniforms.light_positions_or_vectors.value.push(new THREE.Vector4(0,0,0,0));
            uniforms.light_colors.value.push(new THREE.Vector4(0,0,0,1));
            uniforms.light_attenuation_factors.value.push(0.0);
        }
    }
}

function animate() {
    controls.update();
	renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate );