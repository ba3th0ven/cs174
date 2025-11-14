import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
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
//////////////////////////////////

// Operating table
const table_geometry = new THREE.BoxGeometry( 10, 1, 20 );
const table_material = new THREE.MeshBasicMaterial( { color: 0x777b7e, ambient: 0.0, diffusivity: 0.5, specularity: 1.0, smoothness: 40.0 } );
const table = new THREE.Mesh( table_geometry, table_material );
scene.add( table );

const leg_geometry = new THREE.CylinderGeometry( 0.5, 0.5, 10, 32 );
const leg1 = new THREE.Mesh( leg_geometry, table_material );
const leg2 = new THREE.Mesh( leg_geometry, table_material );
const leg3 = new THREE.Mesh( leg_geometry, table_material );
const leg4 = new THREE.Mesh( leg_geometry, table_material );

leg1.position.set(4.5, -5, -9.5);
leg2.position.set(-4.5, -5, -9.5);
leg3.position.set(4.5, -5, 9.5);
leg4.position.set(-4.5, -5, 9.5);
scene.add( leg1, leg2, leg3, leg4 );

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