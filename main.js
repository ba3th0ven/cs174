import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';


const textureLoader = new THREE.TextureLoader();

const scene = new THREE.Scene();
let clock = new THREE.Clock();

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

const transformControls = new TransformControls(camera, renderer.domElement);
scene.add(transformControls.getHelper());

// prevent objects from being scaled
/*
transformControls.showX = false;
transformControls.showY = false;
transformControls.showZ = false;
*/

/////// Canvas for instructions ////////

// Create a canvas element
const canvas = document.createElement('canvas');
canvas.width = 8392; // Set appropriate dimensions
canvas.height = 512;
const ctx = canvas.getContext('2d');

// Configure and draw text on the canvas
ctx.fillStyle = 'white';
ctx.font = '400px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('time remaining:', canvas.width / 2, canvas.height / 2);

// Create a CanvasTexture from the canvas
const texture = new THREE.CanvasTexture(canvas);
texture.needsUpdate = true; // Important for dynamic updates

// Create a material and a sprite
const material = new THREE.SpriteMaterial({ map: texture });
const sprite = new THREE.Sprite(material);

// Size the sprite properly

const aspect = canvas.width / canvas.height;
const ax = aspect / 24;
const ay = 1.0/24;

const worldHeight = 2;   // choose height in world units
sprite.scale.set(worldHeight * ax, worldHeight * ay, 1);

// Position and add the sprite to the scene
sprite.position.set(-1.55, -0.85, -3); // Adjust position as needed
camera.add(sprite);
scene.add(camera);


const hudBox = new THREE.Group();

function makeIcon(path) {
    const tex = new THREE.TextureLoader().load(path);
    const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true
    });

    const s = new THREE.Sprite(mat);
    const height = 2; // world height you want
    s.scale.set(height * 1.1 / 18.0, height / 18.0, 1);

    return s;
}

let life1 = makeIcon('pictures/heart.png');
let life2 = makeIcon('pictures/heart.png');
let life3 = makeIcon('pictures/heart.png');
let lives = [life1, life2, life3]

life1.position.set(-0.15, 0, 0);
life2.position.set(0, 0, 0);
life3.position.set(0.15, 0, 0);

hudBox.add(life1);
hudBox.add(life2);
hudBox.add(life3);



hudBox.position.set(1.55, -0.8, -3);

camera.add(hudBox);
scene.add(camera);

// 
// textureLoader.load('pictures/heart.png', texture => {
//     const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
//     const spriteHUD = new THREE.Sprite(material);

//     const img = texture.image;
//     const aspect = img.width / img.height;

//     const height = 2; // world height you want
//     spriteHUD.scale.set(height * aspect / 18.0, height / 18.0, 1);

//     camera.add(spriteHUD);
//     scene.add(camera);

//     spriteHUD.position.set(1.5, -0.75, -3);

// });

/////////////// Lights/Rays ///////////////

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hovered = null;
let selected = null;
let hit = null;
let dragging = false;
let hasCollided = false;
let stage = 'start'; // start, remove, replace, done
let resetting = false;

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

//////////////////////////
////// shaders ///////////

class waveForm_render {
    vertexShader() {
        return `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
        `;
    }

    fragmentShader() {
        return `
        #define S smoothstep
        #define e 2.71828
        #define T (animation_time * 0.5)

        uniform float beatPeriod;
        uniform float animation_time;
        varying vec2 vUv;
        void main() {
            vec2 uv = vec2(vUv.x, vUv.y - 0.5);
            
            float mark = 0.7;
            float r = 0.01;
            
            float t = mod(uv.x+T, beatPeriod);
            float attn = pow(e, -20.*t);
            
            float y = 0.3*sin(t*60.0)*attn;
            
            float d = length(uv - vec2(uv.x, y));
            float a = uv.x < mark ? S(0.0, 0.001, 0.005-d) : 0.;

            d = length(uv - vec2(mark, y));
            float b = uv.x < mark+r ? S(0.0, 0.001, r-d) : 0.;

            vec3 col = vec3(b, a+b, b);

            gl_FragColor = vec4(col,1.0);
        }
        `;
    }
}

// Custom Phong Shader has already been implemented, no need to make change.
function createPhongMaterial(materialProperties) {
    const numLights = 3;
    
    // convert shape_color1 to a Vector4
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
        varying vec3 N, vertex_worldspace;

        // ***** PHONG SHADING HAPPENS HERE: *****
        vec3 phong_model_lights(vec3 N, vec3 vertex_worldspace) {
            vec3 E = normalize(camera_center - vertex_worldspace); // View direction
            vec3 result = vec3(0.0); // Initialize the output color
            for(int i = 0; i < N_LIGHTS; i++) {
                // Calculate the vector from the surface to the light source
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                    light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length(surface_to_light_vector); // Light distance
                vec3 L = normalize(surface_to_light_vector); // Light direction
                
                // Phong uses the reflection vector R
                vec3 R = reflect(-L, N); // Reflect L around the normal N
                
                float diffuse = max(dot(N, L), 0.0); // Diffuse term
                float specular = pow(max(dot(R, E), 0.0), smoothness); // Specular term
                
                // Light attenuation
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light);
                
                // Calculate the contribution of this light source
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
            N = normalize(mat3(model_transform) * normal / squared_scale);
            vertex_worldspace = (model_transform * vec4(position, 1.0)).xyz;
        }
    `;
    // Fragment Shader
    let fragmentShader = `
        precision mediump float;
        const int N_LIGHTS = ${numLights};
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS];
        uniform vec4 light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 camera_center;
        varying vec3 N, vertex_worldspace;

        // ***** PHONG SHADING HAPPENS HERE: *****
        vec3 phong_model_lights(vec3 N, vec3 vertex_worldspace) {
            vec3 E = normalize(camera_center - vertex_worldspace); // View direction
            vec3 result = vec3(0.0); // Initialize the output color
            for(int i = 0; i < N_LIGHTS; i++) {
                // Calculate the vector from the surface to the light source
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                    light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length(surface_to_light_vector); // Light distance
                vec3 L = normalize(surface_to_light_vector); // Light direction
                
                // Phong uses the reflection vector R
                vec3 R = reflect(-L, N); // Reflect L around the normal N
                
                float diffuse = max(dot(N, L), 0.0); // Diffuse term
                float specular = pow(max(dot(R, E), 0.0), smoothness); // Specular term
                
                // Light attenuation
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light);
                
                // Calculate the contribution of this light source
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                        + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        }

        void main() {
            // Compute an initial (ambient) color:
            vec4 color = vec4(shape_color.xyz * ambient, shape_color.w);
            // Compute the final color with contributions from lights:
            color.xyz += phong_model_lights(normalize(N), vertex_worldspace);
            gl_FragColor = color;
        }
    `;
    // Prepare uniforms
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

function isDescendant(child, parent) {
    while (child) {
        if (child === parent) return true;
        child = child.parent;
    }
    return false;
}

//////////////////////////////////

// walls
let walllen = 40;
let wallup = 10;

const wallgeo = new THREE.BoxGeometry( walllen, 0.2, walllen );
const wallmaterial = new THREE.MeshPhongMaterial( { color: 0xbdbabb, ambient: 0.0, diffusivity: 0.5, specularity: 1.0, smoothness: 40.0 } );

const wall_diffuse = textureLoader.load('public/models/walls/modern-fractured-wallpaper_albedo.png');
const wall_metallic = textureLoader.load('public/models/walls/modern-fractured-wallpaper_metallic.png');
const wall_normal = textureLoader.load('public/models/walls/modern-fractured-wallpaper_normal-ogl.png');
const wall_pbr = textureLoader.load('public/models/walls/modern-fractured-wallpaper_height.png');
const wall_roughness = textureLoader.load('public/models/walls/modern-fractured-wallpaper_roughness.png');

const wall_material = new THREE.MeshStandardMaterial({
      map: wall_diffuse,
      normalMap: wall_normal,
      roughnessMap: wall_roughness,
      roughness: 1,
      metalnessMap: wall_metallic,
      metalness: 0.1,  
      bumpMap: wall_pbr,
});


const wall_back = new THREE.Mesh( wallgeo, wall_material );
const wall_right = new THREE.Mesh( wallgeo, wall_material );
const wall_left = new THREE.Mesh( wallgeo, wall_material );
scene.add( wall_back, wall_right, wall_left);

const wall_back_bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
wall_back_bbox.setFromObject(wall_back);
const wall_back_helper = new THREE.Box3Helper( wall_back_bbox, 0xffff00 );
wall_back.add(wall_back_helper);
wall_back_helper.visible = false;

const wall_right_bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
wall_right_bbox.setFromObject(wall_right);
const wall_right_helper = new THREE.Box3Helper( wall_right_bbox, 0xffff00 );
wall_right.add(wall_right_helper);
wall_right_helper.visible = false;

const wall_left_bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
wall_left_bbox.setFromObject(wall_left);
const wall_left_helper = new THREE.Box3Helper( wall_left_bbox, 0xffff00 );
wall_left.add(wall_left_helper);
wall_left_helper.visible = false;

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

floorgeo.castShadow = true;
floorgeo.receiveShadow = true;

const floormaterial = new THREE.MeshPhongMaterial( { color: 0xbdbabb, ambient: 0.0, diffusivity: 0.5, specularity: 1.0, smoothness: 40.0 } );

const floor_diffuse = textureLoader.load('public/models/base-white-tile-bl/base-white-tile_albedo.png');
const floor_metallic = textureLoader.load('public/models/base-white-tile-bl/base-white-tile_metallic.png');
const floor_normal = textureLoader.load('public/models/base-white-tile-bl/base-white-tile_normal-ogl.png');
const floor_pbr = textureLoader.load('public/models/base-white-tile-bl/base-white-tile_height.png');
const floor_roughness = textureLoader.load('public/models/base-white-tile-bl/base-white-tile_roughness.png');

const floor_material = new THREE.MeshStandardMaterial({
      map: floor_diffuse,
      normalMap: floor_normal,
      roughnessMap: floor_roughness,
      roughness: 1,
      metalnessMap: floor_metallic,
      metalness: 0.1,  
      bumpMap: floor_pbr,
      castShadow: true,
      receiveShadow: true
});

const floor = new THREE.Mesh( floorgeo, floor_material );
scene.add( floor );

const floor_bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
floor_bbox.setFromObject(floor);
const floor_helper = new THREE.Box3Helper( floor_bbox, 0xffff00 );
floor.add(floor_helper);

let floort = translationMatrix(0, -6, 0);
let floortransform = new THREE.Matrix4();

floortransform.multiplyMatrices(floort, floortransform);

floor.applyMatrix4(floortransform);

//////////////////////////////////


//////////////////////////////////
///////////// Meshes /////////////

// Operating table
const table = new THREE.Group()
const tabletop_geometry = new THREE.BoxGeometry( 12.7, 1, 23 );
tabletop_geometry.castShadow = true;
tabletop_geometry.receiveShadow = true;
wall_back.add(wall_back_helper);

const table_diffuse = textureLoader.load('public/models/grey-upholstery-bl/grey-upholstery_albedo.png');
const table_metallic = textureLoader.load('public/models/grey-upholstery-bl/grey-upholstery_metallic.png');
const table_normal = textureLoader.load('public/models/grey-upholstery-bl/grey-upholstery_normal-ogl.png');
const table_pbr = textureLoader.load('public/models/grey-upholstery-bl/grey-upholstery_height.png');
const table_roughness = textureLoader.load('public/models/grey-upholstery-bl/grey-upholstery_roughness.png');



const table_material = new THREE.MeshStandardMaterial({
      map: table_diffuse,
      normalMap: table_normal,
      roughnessMap: table_roughness,
      roughness: 0.6,
      metalnessMap: table_metallic,
      metalness: 0.50,  
      bumpMap: table_pbr,
      side: THREE.DoubleSide
});

// const table_material = new THREE.MeshPhongMaterial( { color: 0x777b7e, ambient: 0.0, diffusivity: 0.5, specularity: 1.0, smoothness: 40.0 } );
const tabletop = new THREE.Mesh( tabletop_geometry, table_material );
const leg_geometry = new THREE.CylinderGeometry( 0.5, 0.5, 7, 32 );
const leg1 = new THREE.Mesh( leg_geometry, table_material );
const leg2 = new THREE.Mesh( leg_geometry, table_material );
const leg3 = new THREE.Mesh( leg_geometry, table_material );
const leg4 = new THREE.Mesh( leg_geometry, table_material );

leg1.castShadow = true;
leg1.receiveShadow = true;

leg2.castShadow = true;
leg2.receiveShadow = true;

leg3.castShadow = true;
leg3.receiveShadow = true;

leg4.castShadow = true;
leg4.receiveShadow = true;

leg1.position.set(5.5, -3.1, -10.5);
leg2.position.set(-5.5, -3.1, -10.5);
leg3.position.set(5.5, -3.1, 10.5);
leg4.position.set(-5.5, -3.1, 10.5);
table.add(tabletop, leg1, leg2, leg3, leg4);

table.position.set(-2.4, 0, -0.5);
scene.add( table );

//////////////////////////////////




//////////////////////////////////

// Second smaller table for tools
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

/*
let light2 = new THREE.PointLight(0x1f1f1f, 1, 10, 1);
light2.castShadow = true
scene.add(light2);
*/

const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
// ambientLight.castShadow = true;
scene.add(ambientLight);

//////////////////////////////////
let loader = new OBJLoader();

function loadModel(obj, path, material, trans, scale) {
    return new Promise((resolve, reject) => {
        loader.load(
            path,
            // onLoad
            (object) => {
                object.traverse((child) => {
                    if (child.isMesh) {
                        child.material = material;
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.geometry.computeVertexNormals();
                    }
                });

                obj = object;

                console.log(path, 'loaded successfully!');
                if (object.children[0] && object.children[0].geometry && object.children[0].geometry.attributes.position) {
                    console.log('Vertices:', object.children[0].geometry.attributes.position.count);
                }

                // Apply transform
                let transform = new THREE.Matrix4();
                transform.multiplyMatrices(trans, transform);
                transform.multiplyMatrices(scale, transform);
                object.applyMatrix4(transform);

                resolve(object);   // <-- IMPORTANT
            },

            // onProgress
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },

            // onError
            (error) => {
                console.error('Error loading ', path, error);
                reject(error);
            }
        );
    });
}

// Load lamp
let otlamp;

const lamp_diffuse = textureLoader.load('public/models/lamp_whitemetal/Poliigon_ClayCeramicGlossy_5212_AmbientOcclusion.jpg');
const lamp_metallic = textureLoader.load('public/models/lamp_whitemetal/Poliigon_ClayCeramicGlossy_5212_Metallic.jpg');
const lamp_normal = textureLoader.load('public/models/lamp_whitemetal/Poliigon_ClayCeramicGlossy_5212_Normal.png');
const lamp_pbr = textureLoader.load('public/models/lamp_whitemetal/Poliigon_ClayCeramicGlossy_5212_Displacement.tiff');
const lamp_roughness = textureLoader.load('public/models/lamp_whitemetal/Poliigon_ClayCeramicGlossy_5212_Roughness.jpg');

const lamp_material = new THREE.MeshStandardMaterial({
      map: lamp_diffuse,
      normalMap: lamp_normal,
      roughnessMap: lamp_roughness,
      roughness: 1,
      metalnessMap: lamp_metallic,
      metalness: 0.1,  
      bumpMap: lamp_pbr,
});

loader.load(
    'public/models/lamp_base.obj',
    (object) => {
        object.traverse((child) => {
            if (child.isMesh) {
                child.material = lamp_material;
                child.castShadow = true;
                child.receiveShadow = true;

                // Compute normals for proper lighting
                child.geometry.computeVertexNormals();
            }
        });

        otlamp = object;
        scene.add(otlamp);

        console.log('ot lamp loaded successfully!');
        console.log('Vertices:', object.children[0].geometry.attributes.position.count);

        let lscaling = 0.7

        let lampm = translationMatrix(-8, 4.25, -6);
        let lamp_rot = rotationMatrixZ(-Math.PI);
        lamp_rot = lamp_rot.multiplyMatrices(lamp_rot, rotationMatrixY(-Math.PI));
        let lampscale = scaleMatrix(lscaling, lscaling, lscaling);
        let lamp_transform = new THREE.Matrix4();

        lamp_transform.multiplyMatrices(lampscale, lamp_transform);
        // lamp_transform.multiplyMatrices(lamp_rot, lamp_transform);
        lamp_transform.multiplyMatrices(lampm, lamp_transform);

        object.applyMatrix4(lamp_transform)
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('Error loading ot lamp model:', error);
    }
);

// Load lamp bulbs

let bulbmat = new THREE.MeshStandardMaterial({
      map: lamp_diffuse,
      normalMap: lamp_normal,
      roughnessMap: lamp_roughness,
      roughness: 1,
      metalnessMap: lamp_metallic,
      metalness: 0.1,  
      bumpMap: lamp_pbr,
});

bulbmat.emissive = new THREE.Color(0xffffaa);
bulbmat.emissiveIntensity = 1;

function createBulb(onLoad) {
    let bulb;

    loader.load(
        'public/models/bulb.obj',
        (object) => {
            object.traverse((child) => {
                if (child.isMesh) {
                    child.material = bulbmat;
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Compute normals for proper lighting
                    child.geometry.computeVertexNormals();
                }
            });

            bulb = object;

            let bulblight = new THREE.PointLight(0xffffff, 1, 15, 0.001);
            bulblight.castShadow = true;
            bulblight.position.set(0, 3, 0);
            bulb.add(bulblight);

            onLoad(bulb);

            // otlamp.add(bulb);

            console.log('bulb loaded successfully!');
            console.log('Vertices:', object.children[0].geometry.attributes.position.count);
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('Error loading bulb model:', error);
        }
    );
}

let shift1 = 4.5;
let shift2 = shift1 * 0.9;

// make 4 bulbs
createBulb((bulb) => {
    otlamp.add(bulb);
});

createBulb((bulb) => {
    bulb.position.set(0, 0, shift1);
    otlamp.add(bulb);
});

createBulb((bulb) => {
    bulb.position.set(-shift2 + 0.4, -shift2 + 1.4, 0);
    otlamp.add(bulb);
});

createBulb((bulb) => {
    bulb.position.set(-shift2 + 0.4, -shift2 + 1.4, shift1);
    otlamp.add(bulb);
});



// Heart #1 inside of person

// Load heart model
let heart;
let heart2;

const heart_diffuse = textureLoader.load('models/heart/texture_diffuse.png');
const heart_metallic = textureLoader.load('models/heart/texture_metallic.png');
const heart_normal = textureLoader.load('models/heart/texture_normal.png');
const heart_pbr = textureLoader.load('models/heart/texture_pbr.png');
const heart_roughness = textureLoader.load('models/heart/texture_roughness.png');

const heart_material = new THREE.MeshStandardMaterial({
      map: heart_diffuse,
      normalMap: heart_normal,
      roughnessMap: heart_roughness,
      roughness: 1,
      metalnessMap: heart_metallic,
      metalness: 0.1,  
      bumpMap: heart_pbr,
});

let heart_bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
let heart_helper;

loader.load(
    'models/heart/base.obj',
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
                child.material = heart_material;
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


        let heartm = translationMatrix(-2, 2.3, -4.5);
        let heart_rotx = rotationMatrixX(-Math.PI / 2.0);
        let heartscale = scaleMatrix(0.7, 0.7, 0.7);
        let heart_transform = new THREE.Matrix4();

        // heart_transform.multiplyMatrices(heartscale, heart_transform);
        heart_transform.multiplyMatrices(heart_rotx, heart_transform);
        heart_transform.multiplyMatrices(heartm, heart_transform);

        object.applyMatrix4(heart_transform)

        console.log('heart position: ', heart.position)
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('Error loading heart model:', error);
    }
);

const tools = {};
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -10);  // horizontal plane
const dragOffset = new THREE.Vector3();

const heart2_bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
let heart2_helper;

loader.load(
    'models/heart/base.obj',
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
                child.material = heart_material;
                child.castShadow = true;
                child.receiveShadow = true;

                // Compute normals for proper lighting
                child.geometry.computeVertexNormals();
            }
        });

        heart2 = object;
        scene.add(heart2);

        console.log('Heart loaded successfully!');
        console.log('Vertices:', object.children[0].geometry.attributes.position.count);


        let heartm = translationMatrix(9.5, -1.1, 2);
        let heart_rotx = rotationMatrixX(-Math.PI / 2.0);
        let heartscale = scaleMatrix(0.7, 0.7, 0.7);
        let heart_transform = new THREE.Matrix4();

        // heart_transform.multiplyMatrices(heartscale, heart_transform);
        heart_transform.multiplyMatrices(heart_rotx, heart_transform);
        heart_transform.multiplyMatrices(heartm, heart_transform);

        object.applyMatrix4(heart_transform)

        tools['heart'] = { mesh: heart2.children[0],
                wrapper: heart2, 
                pos: heart2.children[0].position.clone(),
                rot: heart2.children[0].quaternion.clone(),
                name: 'heart'};
            console.log(heart2, tools['heart']);
            console.log(tools['heart'].pos, tools['heart'].rot)
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('Error loading heart model:', error);
    }
);

// Load ribcage model
let ribcage;

const rib_diffuse = textureLoader.load('models/heart/texture_diffuse.png');
const rib_metallic = textureLoader.load('models/heart/texture_metallic.png');
const rib_normal = textureLoader.load('models/heart/texture_normal.png');
const rib_pbr = textureLoader.load('models/heart/texture_pbr.png');
const rib_roughness = textureLoader.load('models/heart/texture_roughness.png');

const rib_material = new THREE.MeshStandardMaterial({
      map: rib_diffuse,
      normalMap: rib_normal,
      roughnessMap: rib_roughness,
      roughness: 1,
      metalnessMap: rib_metallic,
      metalness: 0.1,  
      bumpMap: rib_pbr,
      DoubleSide: true
});

let rib_bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
let rib_helper;


loader.load(
    'public/models/12700_RibCage_v2.obj',
    (object) => {
        object.traverse((child) => {
            if (child.isMesh) {
                child.material = rib_material;
                child.castShadow = true;
                child.receiveShadow = true;

                // Compute normals for proper lighting
                child.geometry.computeVertexNormals();
            }
        });

        ribcage = object;
        scene.add(ribcage);

        console.log('ribcage loaded successfully!');
        console.log('Vertices:', object.children[0].geometry.attributes.position.count);

        let rscaling = 0.07

        let ribm = translationMatrix(-2.175, 2.2, -3.8);
        let rib_rot = rotationMatrixZ(-Math.PI);
        rib_rot = rib_rot.multiplyMatrices(rib_rot, rotationMatrixY(-Math.PI));
        let ribscale = scaleMatrix(rscaling, rscaling, rscaling);
        let rib_transform = new THREE.Matrix4();

        rib_transform.multiplyMatrices(ribscale, rib_transform);
        rib_transform.multiplyMatrices(rib_rot, rib_transform);
        rib_transform.multiplyMatrices(ribm, rib_transform);

        object.applyMatrix4(rib_transform)
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('Error loading rib model:', error);
    }
);

const body_diffuse = textureLoader.load('public/models/skin/skin_0001_color_4k.jpg');
const body_metallic = textureLoader.load('models/heart/texture_metallic.png');
const body_normal = textureLoader.load('public/models/skin/skin_0001_normal_directx_4k.png');
const body_pbr = textureLoader.load('public/models/skin/skin_0001_height_4k.png');
const body_roughness = textureLoader.load('public/models/skin/skin_0001_roughness_4k.jpg');

const body_bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
let body_helper;

let humanbody;
let humanbody2; 

loader.load('models/final_body.obj',(object) => {
        // Create realistic body material
        const skin_material = new THREE.MeshStandardMaterial({
            map: body_diffuse,
            normalMap: body_normal,
            roughnessMap: body_roughness,
            roughness: 1,
            metalnessMap: body_metallic,
            metalness: 0.01,  
            bumpMap: body_pbr,
            side: THREE.DoubleSide
        });

        skin_material.normalMap.wrapS = THREE.RepeatWrapping;
        skin_material.normalMap.wrapT = THREE.RepeatWrapping;

        // body_material.normalMap.repeat.set(6, 6); // repeat the texture 4×4 times

        skin_material.normalScale.set(0.2, 0.2); 

        object.traverse((child) => {
            if (child.isMesh) {
                child.material = skin_material;
                child.castShadow = true;
                child.receiveShadow = true;

                // Compute normals for proper lighting
                child.geometry.computeVertexNormals();
            }
        });


        humanbody = object;
        scene.add(humanbody);

        let humanscale = 1.3;

        let bodyt = translationMatrix(-3, 1.2, -1);

        let bodys = scaleMatrix(humanscale, humanscale, humanscale);
        let body_transform = new THREE.Matrix4();

        body_transform.multiplyMatrices(bodys, body_transform);
        body_transform.multiplyMatrices(bodyt, body_transform);

        humanbody.applyMatrix4(body_transform)

        console.log('Body loaded successfully!');

        if (object.children[0] && object.children[0].geometry && object.children[0].geometry.attributes.position) {
            console.log('Vertices:', object.children[0].geometry.attributes.position.count);
        }
    }, (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    }, (error) => {
        console.error('Error loading body model:', error);
    }
);


const hair_diffuse = textureLoader.load('public/models/human-head-with-short-hair/source/model/skincolor_diffuse.png');
const hair_metallic = textureLoader.load('public/models/human-head-with-short-hair/source/model/texture_metallic.png');
const hair_normal = textureLoader.load('public/models/human-head-with-short-hair/source/model/texture_normal.png');
const hair_pbr = textureLoader.load('public/models/human-head-with-short-hair/source/model/texture_pbr.png');
const hair_roughness = textureLoader.load('public/models/human-head-with-short-hair/source/model/texture_roughness.png');



const hair_material = new THREE.MeshStandardMaterial({
      map: hair_diffuse,
      normalMap: hair_normal,
      roughnessMap: hair_roughness,
      roughness: 1,
      metalnessMap: hair_metallic,
      metalness: 0.01,  
      bumpMap: hair_pbr,
      side: THREE.DoubleSide
});

let hair;
loader.load('models/gingerhair.obj',(object) => {
        // Create realistic body material
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xe6bc98,
            specular: 0x111111,
            shininess: 50,
            side: THREE.DoubleSide
        });

        object.traverse((child) => {
            if (child.isMesh) {
                child.material = hair_material;
                child.castShadow = true;
                child.receiveShadow = true;

                // Compute normals for proper lighting
                child.geometry.computeVertexNormals();
            }
        });


        hair = object;
        scene.add(hair);

        let hairscale = 0.57;

        let hairt = translationMatrix(-2.5, 3.5, -7.2);

        let hairs = scaleMatrix(hairscale, hairscale, hairscale);
        let hairrot = rotationMatrixX(-90 * Math.PI / 180.0);
        let hairtransform = new THREE.Matrix4();

        hairtransform.multiplyMatrices(hairs, hairtransform);
        hairtransform.multiplyMatrices(hairrot, hairtransform);
        hairtransform.multiplyMatrices(hairt, hairtransform);

        hair.applyMatrix4(hairtransform)

        console.log('hair loaded successfully!');

        if (object.children[0] && object.children[0].geometry && object.children[0].geometry.attributes.position) {
            console.log('Vertices:', object.children[0].geometry.attributes.position.count);
        }
    }, (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    }, (error) => {
        console.error('Error loading hair model:', error);
    }
);

// const hair_diffuse = textureLoader.load('public/models/hair_texture/fabrics_0037_color_4k.jpg');
// const hair_metallic = textureLoader.load('models/heart/texture_metallic.png');
// const hair_normal = textureLoader.load('public/models/hair_texture/fabrics_0037_normal_directx_4k.png');
// const hair_pbr = textureLoader.load('public/models/hair_texture/fabrics_0037_height_4k.png');
// const hair_roughness = textureLoader.load('public/models/hair_texture/fabrics_0037_roughness_4k.jpg');



// const hair_material = new THREE.MeshStandardMaterial({
//       map: hair_diffuse,
//       normalMap: hair_normal,
//       roughnessMap: hair_roughness,
//       roughness: 1,
//       metalnessMap: hair_metallic,
//       metalness: 0.01,  
//       bumpMap: hair_pbr,
//       side: THREE.DoubleSide
// });

// let hair;
// loader.load('models/gingerhair.obj',(object) => {
//         // Create realistic body material
//         const bodyMaterial = new THREE.MeshPhongMaterial({
//             color: 0xe6bc98,
//             specular: 0x111111,
//             shininess: 50,
//             side: THREE.DoubleSide
//         });

//         object.traverse((child) => {
//             if (child.isMesh) {
//                 child.material = hair_material;
//                 child.castShadow = true;
//                 child.receiveShadow = true;

//                 // Compute normals for proper lighting
//                 child.geometry.computeVertexNormals();
//             }
//         });


//         hair = object;
//         scene.add(hair);

//         let hairscale = 0.5;

//         let hairt = translationMatrix(-2.5, 4, -7.8);

//         let hairs = scaleMatrix(hairscale, hairscale, hairscale);
//         let hairrot = rotationMatrixX(-90);
//         let hairtransform = new THREE.Matrix4();

//         hairtransform.multiplyMatrices(hairs, hairtransform);
//         hairtransform.multiplyMatrices(hairrot, hairtransform);
//         hairtransform.multiplyMatrices(hairt, hairtransform);

//         hair.applyMatrix4(hairtransform)

//         console.log('hair loaded successfully!');

//         if (object.children[0] && object.children[0].geometry && object.children[0].geometry.attributes.position) {
//             console.log('Vertices:', object.children[0].geometry.attributes.position.count);
//         }
//     }, (xhr) => {
//         console.log((xhr.loaded / xhr.total * 100) + '% loaded');
//     }, (error) => {
//         console.error('Error loading hair model:', error);
//     }
// );


//////////////////////////////////

const cardiogram_bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
let cardiogram_helper;

const ecg_diffuse = textureLoader.load('public/models/brushed-metal-bl/brushed-metal_albedo.png');
const ecg_metallic = textureLoader.load('public/models/brushed-metal-bl/brushed-metal_metallic.png');
const ecg_normal = textureLoader.load('public/models/brushed-metal-bl/brushed-metal_normal-ogl.png');
const ecg_pbr = textureLoader.load('public/models/skin/skin_0001_height_4k.png');
const ecg_roughness = textureLoader.load('public/models/brushed-metal-bl/brushed-metal_roughness.png');



const ecg_material = new THREE.MeshStandardMaterial({
      map: ecg_diffuse,
      normalMap: ecg_normal,
      roughnessMap: ecg_roughness,
      roughness: 0.6,
      metalnessMap: ecg_metallic,
      metalness: 0.50,  
      bumpMap: ecg_pbr,
      side: THREE.DoubleSide
});

//cardiogram
loader.load('models/cardiogram.obj',(object) => {
        const cardiogram_mat = new THREE.MeshPhongMaterial({
            color:0xFFFFF7,
            specular: 0x111111,
            shininess: 50,
            side: THREE.DoubleSide
        });

        object.traverse((child) => {
            if (child.isMesh) {
                child.material = ecg_material;
                child.castShadow = true;
                child.receiveShadow = true;

                // Compute normals for proper lighting
                child.geometry.computeVertexNormals();
            }
        });

        scene.add(object);

        let cardscale = 1.7;

        let cardt = translationMatrix(5.5, -5.5, -12);
        let cards = scaleMatrix(cardscale, cardscale, cardscale);
        let card_transform = new THREE.Matrix4();

        card_transform.multiplyMatrices(cards, card_transform);
        card_transform.multiplyMatrices(cardt, card_transform);

        object.applyMatrix4(card_transform);

        console.log('cardiogram loaded successfully!');
        //console.log('Vertices:', object.children[0].geometry.attributes.position.count);
    }, (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    }, (error) => {
        console.error('Error loading cardiogram model:', error);
    }
);


/////////////////////////////////////////////
const screen_geo = new THREE.BoxGeometry( 4.8, 0.2, 2.8 );
// const screen_geo = new THREE.PlaneGeometry(3, 2);

let animation_time = 0.0;
let waveform = new waveForm_render();

const monitor_uniforms = {
    beatPeriod: { value: 0.5 },
    animation_time: { value: animation_time }
};

let screen_waveform = new THREE.ShaderMaterial({
    uniforms: monitor_uniforms,
    vertexShader: waveform.vertexShader(),
    fragmentShader: waveform.fragmentShader(),

});

const screen_mat = new THREE.MeshPhongMaterial( { color: 0x121212, ambient: 0.0, diffusivity: 0.5, specularity: 1.0, smoothness: 40.0 } );

const screen = new THREE.Mesh( screen_geo, screen_waveform );
scene.add( screen );

let screent = translationMatrix(5.5, 8, -11.5);
let screenrotx = rotationMatrixX(Math.PI / 2.0);
let screen_transform = new THREE.Matrix4();

screen_transform.multiplyMatrices(screenrotx, screen_transform);
screen_transform.multiplyMatrices(screent, screen_transform);

screen.applyMatrix4(screen_transform);

/////////////////////////////////////////////

const geometry = new MeshLineGeometry();
// const geometryPoints = [
//   new THREE.Vector3(-2, 3, 0),
//   new THREE.Vector3(3, 3, -2),
//   new THREE.Vector3(0, -2, 0),
//   new THREE.Vector3(-2, 0, 2),
//   new THREE.Vector3(-2, 6, 5),
//   new THREE.Vector3(5, 2, -3),
// ];

// # very approximate sinusoidal representation
function ecg(t, period) {
    t = t * period;
    const phase = 2.0 * Math.cos(t);
    const r_wave = -Math.sin(t + phase);
    const q_scalar = 0.50 - 0.75 * Math.sin(t - 1.0);
    const s_scalar = 0.25 - 0.125 * Math.sin(1.25 * phase - 1.0);
    return 3.14 * q_scalar * r_wave * s_scalar;   // amplitude
}
const geometryPoints = [];

const ECG_SCALE = 8;   // amplitude scaling factor
const period = 0.5;

for (let t = 0; t <= Math.PI * 12; t += 0.01) {

  const x = t; 
  const y = ECG_SCALE * ecg(t, period);

  geometryPoints.push(new THREE.Vector3(x, y, 0));
}

// const geometryPoints = [];
// for (let t = 0; t <= Math.PI * 2; t += 0.01) {
//   const x = 16 * Math.pow(Math.sin(t), 3);
//   const y =
//     12 * Math.cos(t) -
//     5 * Math.cos(3 * t) -
//     2 * Math.cos(3 * t) -
//     Math.cos(4 * t);
//   geometryPoints.push(new THREE.Vector3(x, y, 0));
// }

geometry.setPoints(geometryPoints);
const lineMaterial = new MeshLineMaterial({
  color: new THREE.Color(0x0fbf0f),
  lineWidth: 0.25,
  resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
});

const mymesh = new THREE.Mesh(geometry, lineMaterial);
// screen.add(mymesh);

let scale = 0.1
let waveform_scale = scaleMatrix(scale, scale, scale);
let waveform_rot = rotationMatrixX(-Math.PI / 2.0)
let waveform_tx = translationMatrix(-2, 0.15, 0);

let waveform_transform = new THREE.Matrix4();

waveform_transform.multiplyMatrices(waveform_scale, waveform_transform);
waveform_transform.multiplyMatrices(waveform_rot, waveform_transform);
waveform_transform.multiplyMatrices(waveform_tx, waveform_transform);

mymesh.applyMatrix4(waveform_transform);


/////////////////////////////////////////////

let blanket;

const blanket_diffuse = textureLoader.load('public/models/blanket/fabric_126_albedo-1K.png');
const blanket_metallic = textureLoader.load('public/models/blanket/fabric_126_ambientocclusion-1K.png');
const blanket_normal = textureLoader.load('public/models/blanket/fabric_126_normal-1K.png');
const blanket_pbr = textureLoader.load('public/models/blanket/fabric_126_height-1K.png');
const blanket_roughness = textureLoader.load('public/models/blanket/fabric_126_roughness-1K.png');

const blanket_material = new THREE.MeshStandardMaterial({
      map: blanket_diffuse,
      normalMap: blanket_normal,
      roughnessMap: blanket_roughness,
      roughness: 1,
      metalnessMap: blanket_metallic,
      metalness: 0.5,  
      bumpMap: blanket_pbr,
      side: THREE.DoubleSide
});

loader.load('models/blanket_final.obj',(object) => {
        // Create realistic body material
        const blanketMat = new THREE.MeshPhongMaterial({
            color: 0x89CFFF,
            specular: 0x111111,
            shininess: 10,
            side: THREE.DoubleSide
        });

        object.traverse((child) => {
            if (child.isMesh) {
                child.material = blanket_material;
                child.castShadow = true;
                child.receiveShadow = true;

                // Compute normals for proper lighting
                child.geometry.computeVertexNormals();
            }
        });


        blanket = object;
        scene.add(blanket);

        let blanketscale = 1.3;

        let blankett = translationMatrix(-3.0, 2.0, -1.15);
        let blankets = scaleMatrix(blanketscale*0.95, blanketscale*0.95, blanketscale);
        let blanket_transform = new THREE.Matrix4();

        blanket_transform.multiplyMatrices(blankets, blanket_transform);
        blanket_transform.multiplyMatrices(blankett, blanket_transform);

        blanket.applyMatrix4(blanket_transform)

        console.log('Body loaded successfully!');
        // console.log('Vertices:', object.children[0].geometry.attributes.position.count);
    }, (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    }, (error) => {
        console.error('Error loading body model:', error);
    }
);
//////////////////////////////////

// scalpel
let selectLight = new THREE.PointLight(0xffffff, 1, 0, 2);

/*
let scalpel;
let scalpel_trans = translationMatrix(10, -1.5, -4.5);
let scalpel_scale = scaleMatrix(0.2, 0.2, 0.2);
const scalpel_material = new THREE.MeshPhongMaterial({
            color: 0x999B9B,
            specular: 0x111111,
            shininess: 30,
            side: THREE.DoubleSide
        });
loadModel(scalpel, 'models/scalpel.obj', scalpel_material, 
    scalpel_trans, scalpel_scale)
    .then( (obj) => {
        scalpel = obj;
        tools.push({ mesh: scalpel });
        scalpel.add(selectLight);
        selectLight.visible = false; 
    });

const scalpel = await loader.loadAsync( 'models/scalpel.obj' );
scalpel.scale.setScalar(0.3);
scalpel.position.set(8, 0, 0);
scene.add( scalpel );
scalpel.add(selectLight);
selectLight.visible = false; 
*/

//surgical tools

const gltf_loader = new GLTFLoader();

const ToolNames = {
    // commenting out bc we don't need to select them
    //scissors_T1: "Scissors_T1",
    //scissors_T2: "Scissors_T2",
    //scissors_T3: "Scissors_T3",

    tweezers: "w",
    needle: "Needle",
    scalpel: "SM_Scalpel_low_2",
    
    // syringe: "Syringe",
    // syringe_cap: "Syringe_cap",
};

const TABLE_Y = -1.65; // tool height

gltf_loader.load(
    //'models/vr-surgical-tool-set/source/Surgeon_assets.fbx'
    //'models/vr_surgical_tool_set/scene.gltf',
    'models/tools.glb',
    (gltf) => {
        /*
        set.traverse((child) => {
            if (child.isMesh) {
                child.material = table_material;
                child.castShadow = true;
                child.receiveShadow = true;

                // Compute normals for proper lighting
                child.geometry.computeVertexNormals();
            }
        });
        */

        scene.add(gltf.scene);

        gltf.scene.scale.setScalar(10);
        gltf.scene.position.set(9.5, -1.65, -4);
        //gltf.scene.position.set(toolsX, toolsY, toolsZ);

        for (const [key, name] of Object.entries(ToolNames)) {
            let tool = gltf.scene.getObjectByName(name);
            console.log(tool)

            let bbox = new THREE.Box3().setFromObject(tool);
            let center = bbox.getCenter(new THREE.Vector3());

            // wrapper so we can translate dynamically
            let wrapper = new THREE.Object3D();
            wrapper.position.copy(center);

            // Put wrapper in the scene instead of the original parent node
            tool.parent.add(wrapper);
            wrapper.add(tool);

            tools[key] = { mesh: tool,
                wrapper: wrapper,
                pos: tool.position.clone(),
                rot: wrapper.quaternion.clone(),
                name: key };
            console.log(key, tools[key]);
            console.log(tool)
        }

        console.log(gltf.scene.children)
        console.log('surgical tools loaded successfully!')
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('Error loading surgical tools:', error);
    }
);

gltf_loader.load(
    //'models/vr-surgical-tool-set/source/Surgeon_assets.fbx'
    'models/tray.glb',
    (gltf) => {
        scene.add(gltf.scene)

        gltf.scene.castShadow = true;
        gltf.scene.receiveShadow = true;

        gltf.scene.scale.setScalar(10);
        gltf.scene.position.set(9.5, -1.65, 2);

        console.log(gltf.scene.children)
        console.log('surgical tray loaded successfully!')
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('Error loading surgical tray:', error);
    }
);

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

// Handle keyboard input
document.addEventListener('keydown', onKeyDown, false);

window.addEventListener('pointermove', onPointerMove, false);

window.addEventListener('pointerdown', onPointerDown, false); 

window.addEventListener('pointerup', onPointerUp, false);

transformControls.addEventListener('objectChange', onObjectChange, false); 


/*
// Handle mouse click
document.addEventListener('click', onMouseClick, false);

function onMouseClick() {
    // selectLight.visible = !selectLight.visible;
}
*/


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    lineMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
}

function detach() {
    transformControls.detach();
    controls.enabled = true;
    selected = null;
    dragging = false;
    console.log('detach')
}

function resetPositions() {
    Object.values(tools).forEach(tool => {
        console.log(tool.mesh.position)
        console.log(tool.pos)
        //tool.mesh.position.copy(tool.pos)
        //tool.mesh.quaternion.copy(tool.rot)
    });
}

function onKeyDown(event){
    switch(event.keyCode) {
        case 83: // s for scalpel
            //transformControls.attach(tools['scalpel'].mesh);
            //selectLight.visible = true;
            break;
        case 37:
        case 38:
        case 39:
        case 40: // directional key pressed
            // moveTool(event.keyCode);
            break;
        case 68: // d for detach
            detach();
            break;
        case 82: // r for rotate
            if (selected) {
                console.log('rotate')
                transformControls.mode = 'rotate';
            }
            break;
        case 84: // t for translate
            if (selected) {
                console.log('translate');
                transformControls.mode = 'translate';
            }
            break;
        case 88: // x for reset
            // TODO: this part doesn't work as intended
            // for (tool in tools)
            //resetting = true;
            detach();
            resetPositions();
            break;
        }
}

function onPointerMove(event) {
    mouse.x =  (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // drag mode
    /*
    if (dragging && selected) {
        console.log(selected, selected.bbox)
        if (stage == 'start' && selected.bbox.intersectsBox(heart_bbox)) 
        {
            if (selected.name == 'scalpel') //good 
            {
                stage = 'remove'
                console.log('stab')
            }
            else //bad 
            {
                console.log('wrong tool')
            }
        }
        //return
    }
    */

    // hover mode
    const hits = raycaster.intersectObjects(
        Object.values(tools).map(t => t.mesh),
        true
    );

    if (hits.length > 0) {
        const tool = hits[0].object;

        if (hovered !== tool) {
            // if (hovered) hovered.material.emissive.hex = 0x000000;

            hovered = tool;
            // hovered.material.emissive.hex = 0x444444;
        }
    } else {
        // if (hovered) hovered.material.emissive.hex = 0x000000;
        hovered = null;
    }
}

function onPointerDown() {
    console.log("click");
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(
        Object.values(tools).map(t => t.mesh),
        true
    );

    if (selected) { // Object selected, click -> detach
        //transformControls.detach();
        dragging = true;
        //selected = null;
    }
    else if (hits.length > 0) { // No object selected & hovering -> select
        hit = hits[0].object;
        selected = Object.values(tools).find(tool =>
            hit === tool.mesh || isDescendant(hit, tool.mesh))
        console.log(selected)

        // Initialize drag offset
        raycaster.ray.intersectPlane(dragPlane, dragOffset);
        transformControls.attach(hit);
        controls.enabled = false;
        console.log("Selected:", selected.name);
    } else { // No object selected, not hovering -> do nothing
        //selected = null;
    }
}

function onPointerUp() {
    if (selected) {
        // Snap back to table height
        //selected.position.y = TABLE_Y;   // <-- define earlier
    }

    //transformControls.detach();
    dragging = false;
    //selected = null;
}

function deleteObject(object) {
    if(object.parent) object.parent.remove(object)

    object.geometry.dispose();
    if(object.material && object.material.map) object.material.map.dispose(); // If there's a texture map
    object.material.dispose();
    if(object.helper) object.helper.dispose();

    scene.remove(object)
}

function loseLife() {
    if (lives.length > 0) {
        let life = lives.pop()
        life.visible = false
        life = null
    }
}

function onObjectChange(event) {
    // 'event.target' is the TransformControls instance
    // 'event.target.object' is the currently attached object
    let object = event.target.object;

    //compute bounding box for object being moved
    let bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    bbox.setFromObject(object);

    // collision detection
    if (stage == 'start') { // we need to remove ribcage with scalpel
        //rib_bbox = new THREE.Box3().setFromObject(ribcage);
        rib_bbox.min.set(-3.0, 1.0282559585571287, -5.912026042938233); // Define the minimum coordinates of the box
        rib_bbox.max.set(-1.11372398376464776, 2.3717719459533697, -0.6895980262756338);   // Define the maximum coordinates of the box
        rib_helper = new THREE.Box3Helper( rib_bbox, 0x66FF00 );
        scene.add(rib_helper)

        if (bbox.intersectsBox(rib_bbox)) {

            if (!hasCollided) {
                hasCollided = true;

                console.log('intersection')
                if (selected.name == 'scalpel') //good 
                {
                    stage = 'remove';
                    console.log('stab ribcage')
                    ribcage.visible = false;
                    rib_helper.visible = false;

                    detach()
                    console.log(tools.scalpel)
                    tools.scalpel.mesh.visible = false;
                    scene.remove(tools.scalpel.mesh)
                    delete tools.scalpel
                    hasCollided = false;
                }
                else //bad 
                {
                    console.log('wrong tool')
                    loseLife()
                }
            }
        }
        else {
            hasCollided = false;
        }
    } else if (stage == 'remove') // remove heart with tweezers
    {
        heart_bbox = new THREE.Box3().setFromObject(heart);
        heart_helper = new THREE.Box3Helper( rib_bbox, 0x66FF00 );
        scene.add(heart_helper)

        if (bbox.intersectsBox(heart_bbox)) {
            if (!hasCollided) {
                hasCollided = true;
                console.log('intersection')
                if (selected.name == 'tweezers') //good 
                {
                    stage = 'replace';
                    console.log('removed heart')
                    isFlatlined = !isFlatlined;
                    heart.visible = false;
                    scene.remove(heart_helper)
                    heart_helper = null

                    detach()
                    tools.tweezers.mesh.visible = false;
                    scene.remove(tools.tweezers.mesh)
                    delete tools.tweezers
                    hasCollided = false;
                }
                else //bad 
                {
                    console.log('wrong tool')
                    loseLife()
                }
            }
        }
        else {
            hasCollided = false;
        }
    } else if (stage == 'replace') // replace heart
    {
        rib_bbox.min.set(-3.0, 1.0282559585571287, -5.912026042938233); // Define the minimum coordinates of the box
        rib_bbox.max.set(-1.11372398376464776, 2.3717719459533697, -0.6895980262756338);   // Define the maximum coordinates of the box
        let rib_helper = new THREE.Box3Helper( rib_bbox, 0x66FF00 );
        scene.add(rib_helper)
        rib_helper.visible = true;

        if (bbox.intersectsBox(rib_bbox)) {
            if (!hasCollided) {
                hasCollided = true;
                console.log('intersection')
                if (selected.name == 'remeshed' || selected.name == 'heart') //good 
                {
                    stage = 'sew';
                    console.log('heart replaced')
                    isFlatlined = !isFlatlined;
                    ribcage.visible = true;
                    //scene.remove(rib_helper)
                    //rib_helper = null

                    // place new heart in ribcage
                    detach();
                    heart.visible = true;
                    scene.remove(heart2)
                    heart2 = null
                    //heart2.position.set(9.52, -1.5, 1.5)
                }
                else //bad 
                {
                    console.log('wrong tool')
                    loseLife()
                }
            }
        }
        else {
            hasCollided = false;
        }
    } else if (stage == 'sew') // sew up chest
    {
        rib_bbox.min.set(-3.0, 1.0282559585571287, -5.912026042938233); // Define the minimum coordinates of the box
        rib_bbox.max.set(-1.11372398376464776, 2.3717719459533697, -0.0895980262756338);   // Define the maximum coordinates of the box
        let rib_helper = new THREE.Box3Helper( rib_bbox, 0x66FF00 );
        scene.add(rib_helper)
        rib_helper.visible = true;

        if (bbox.intersectsBox(rib_bbox)) {
            if (!hasCollided) {
                hasCollided = true;
                console.log('intersection')
                if (selected.name == 'needle') //good 
                {
                    stage = 'done';
                    console.log('chest sewed up')
                    rib_helper.visible = false
                    scene.remove(rib_helper)
                    rib_helper = null

                    detach()
                    tools.needle.mesh.visible = false;
                    scene.remove(tools.needle.mesh)
                    delete tools.needle
                    hasCollided = false;
                }
                else //bad 
                {
                    console.log('wrong tool')
                    loseLife()
                }
            }
        }
        else {
            hasCollided = false;
        }
    }
        //return
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

    let time = clock.getElapsedTime();
  
    let bpm = 80;

    let T = 60.0 / (bpm * 1.0);

    let period = time % T;

    monitor_uniforms.animation_time.value = period;
    monitor_uniforms.beatPeriod.value = isFlatlined ? 1.0e10 : T;

    Object.values(tools).forEach(tool => {
        //console.log(tool, tool.helper)
    })

    if (resetting) {
        let stillAnimating = false;

        Object.values(tools).forEach(tool => {
            const wrapper = tool.wrapper;

            // update position
            console.log(wrapper.position)
            wrapper.position.lerp(tool.pos, 0.1);

            console.log(wrapper.position.distanceTo(tool.pos))
            // Check distance to see if it’s close enough
            if (wrapper.position.distanceTo(tool.pos) > 0.001) {
                stillAnimating = true;
            }

            // update rotation
            wrapper.quaternion.rotateTowards(tool.rot);

            // Check for rotation completion
            if (Math.abs(wrapper.rotation.x - tool.rotx) > 0.001 ||
                Math.abs(wrapper.rotation.y - tool.roty) > 0.001 ||
                Math.abs(wrapper.rotation.z - tool.rotz) > 0.001) {
                stillAnimating = true;
            }
        });

        // If all tools are close enough to the start state, stop resetting
        if (!stillAnimating) {
            resetting = false;
        }
    }

    // TODO: add collision logic

    let heartbeat_scale = 1;
    let suncolormod = 0;

    if (period > 0.57 * T) {
        heartbeat_scale = (-0.2 * period / T + 1.2);
    } else if (period < 0.15 * T) {} 
    else {
        heartbeat_scale = (0.15 * period / T + 1);
    }

    if (heart) {
        heart.scale.set(heartbeat_scale, heartbeat_scale*0.8, heartbeat_scale*0.8);
    }

    // stage based logic
}
renderer.setAnimationLoop( animate );

// Keyboard Event Listener
let isFlatlined = false
window.addEventListener('keydown', onKeyPress);
function onKeyPress(event) {
    switch (event.key) {
        case 'f':
        case 'F':
            isFlatlined = !isFlatlined;
        default:
            break;
    }
}