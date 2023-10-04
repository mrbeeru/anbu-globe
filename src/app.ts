import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { sampleImage, spherePointToUV } from './utils';
import Stats from 'three/addons/libs/stats.module.js';


// Create an empty scene
var scene = new THREE.Scene();

// Create clock
var clock = new THREE.Clock();

var renderer = new THREE.WebGLRenderer();

// Configure renderer clear color
renderer.setClearColor("#000000");

// Configure renderer size
renderer.setSize( window.innerWidth, window.innerHeight );

// Append Renderer to DOM
document.body.appendChild( renderer.domElement );

// Create a basic perspective camera
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 1, 1600 );
camera.position.z = 1200

const controls = new OrbitControls( camera, renderer.domElement );

const stats = new Stats();
document.body.appendChild( stats.dom );

// ------------------------------------------------
// FUN STARTS HERE
// ------------------------------------------------
// let stats = {
// 	frames: 0,
// 	time: 0,
// };

const SPHERE_RADIUS = 600;

// Create N tiny dots and spiral them around the sphere.
const DOT_COUNT = 80000;
const DOT_SPHERE_RADIUS = SPHERE_RADIUS + 10;

const geometry = new THREE.SphereGeometry( SPHERE_RADIUS, 128, 128 );
//const geometry = new THREE.BoxGeometry( 10, 10, 10 );
const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } ); 
const sphere = new THREE.Mesh( geometry, material ); 
	
sphere.position.set(0,0,0);
scene.add( sphere );


// A hexagon with a radius of 2 pixels looks like a circle
const dotGeometry = new THREE.CircleGeometry(2, 5);
const dotMaterial = new THREE.MeshBasicMaterial( { color: 0x2222FF} ); 


export default function init() {
  loadImage();
}

function addDots() {
  const vector = new THREE.Vector3();

	for (let i = DOT_COUNT; i >= 0; i--) 
	{
  		const phi = Math.acos(-1 + (2 * i) / DOT_COUNT);
  		const theta = Math.sqrt(DOT_COUNT * Math.PI) * phi;
	
  		// Pass the angle between this dot an the Y-axis (phi)
  		// Pass this dot’s angle around the y axis (theta)
  		// Scale each position by 600 (the radius of the globe)
  		vector.setFromSphericalCoords(DOT_SPHERE_RADIUS, phi, theta);
  		const dotMesh = new THREE.Mesh( dotGeometry, dotMaterial ); 
	
        const uv = spherePointToUV(vector);
        const sampledPixel = sampleImage(imageData, uv);

  		// Move the dot to the newly calculated position

        if (sampledPixel[3]) {
            dotMesh.lookAt(vector.x, vector.y, vector.z);
            dotMesh.position.set(vector.x, vector.y, vector.z);
            scene.add(dotMesh);	
        }
	}
}

function render() {
  requestAnimationFrame( render );

  //logFps()
  orbitCamera();
  stats.update();

  renderer.render(scene, camera);
};

function orbitCamera() {
  //const rotationSpeed = 1/8;

  //const x = SPHERE_RADIUS * Math.sin( clock.getElapsedTime() * rotationSpeed ) * 2;
  //const z = SPHERE_RADIUS * Math.cos( clock.getElapsedTime() * rotationSpeed ) * 2;

  //camera.position.copy( sphere.position ).add( new THREE.Vector3(x,0,z));
  //camera.lookAt( sphere.position );
  controls.update();
}

var imageData: ImageData

async function loadImage(){
  const image = new Image();
  image.crossOrigin = "Anonymous"
  image.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/World_map_blank_without_borders.svg/4378px-World_map_blank_without_borders.svg.png"

  image.onload = ( () => {
    // Create an HTML canvas, get its context and draw the image on it.
    const tempCanvas = document.createElement("canvas");
  
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;

    const ctx = tempCanvas.getContext("2d");

    if (!ctx) {
        throw new Error('could not get 2d context');
    }

    ctx.drawImage(image, 0, 0);

    // Read the image data from the canvas context.
    const imgData = ctx.getImageData(0, 0, image.width, image.height);

    imageData = imgData;
    console.log(imgData)

      addDots();
    render();

  });
}
