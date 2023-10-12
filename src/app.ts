import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getSunLatitudeAndLongitude, sampleImage, spherePointToUV } from './utils';
import Stats from 'three/addons/libs/stats.module.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// Create an empty scene
var scene = new THREE.Scene();
const light = new THREE.DirectionalLight( 0xffffff, 5 );
scene.add( light );

// Renderer
var renderer = new THREE.WebGLRenderer();
renderer.setClearColor("#000000");
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// setup camera
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 1, 3200 );
camera.position.set(1000, 600, 200) // start from europe

// setup controls
const controls = new OrbitControls( camera, renderer.domElement );
controls.autoRotate = true
controls.autoRotateSpeed *= -0.3;
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// setup fps
const stats = new Stats();
document.body.appendChild( stats.dom );

const SPHERE_RADIUS = 600;
const DOT_COUNT = 200000;
const DOT_SPHERE_RADIUS = SPHERE_RADIUS + 30;

// holds the image that is used to mask the dots
let imageData: ImageData

const sun = getSunLatitudeAndLongitude(new Date());
setLightPosition(sun.latitude, sun.longitude)

export default function init() {
  loadImage();
}

function setLightPosition(lat: number, lon: number) {
  const mappedLat = lat  // lat is NS
  const mappedLon = lon // lon is EW
  
  const x = SPHERE_RADIUS * 1.2 * Math.cos(mappedLat * Math.PI/180) * Math.cos(mappedLon * Math.PI/180)
  const y = SPHERE_RADIUS * 1.2 * Math.cos(mappedLat * Math.PI/180) * Math.sin(mappedLon * Math.PI/180)
  const z = SPHERE_RADIUS * 1.2 * Math.sin(mappedLat * Math.PI/180)

  light.position.set(x, z, y);
}

function addSphere() {
  const geometry = new THREE.SphereGeometry( SPHERE_RADIUS, 128, 128 );
  const material = new THREE.MeshPhongMaterial( {
     color: '#0f284c', 
     opacity: 1, 
     transparent: true, 
     shininess: 0,} ); 
  const sphere = new THREE.Mesh( geometry, material ); 
  
  sphere.position.set(0,0,0);
  scene.add( sphere );
}

function addNormalLine(lat: number, lon: number) {

  //latitude doesn't work good at poles
  const mappedLat = lat  // lat is NS
  const mappedLon = -lon // lon is EW

  const x = SPHERE_RADIUS * 1.2 * Math.cos(mappedLat * Math.PI/180) * Math.cos(mappedLon * Math.PI/180)
  const y = SPHERE_RADIUS * 1.2 * Math.cos(mappedLat * Math.PI/180) * Math.sin(mappedLon * Math.PI/180)
  const z = SPHERE_RADIUS * 1.2 * Math.sin(mappedLat * Math.PI/180)

  const points = [];
  points.push( new THREE.Vector3( x/1.2, z/1.2, y/1.2 ) );
  points.push( new THREE.Vector3( x, z, y ));

  const geometry = new THREE.BufferGeometry().setFromPoints( points );
  const tubeGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length * 10, 1, 8, false);
  const material = new THREE.LineBasicMaterial( { color: 0x0000ff, linewidth: 22 } );

  const line = new THREE.Line( tubeGeometry, material );

  scene.add(line)
}

function addIndicators() {
  //poles
  //addNormalLine(90, 0);
  //addNormalLine(-90, 0);

  //hawai
  addNormalLine(19.64, -155.517);

  //london
  addNormalLine(51.5072, -0.1276);

  //bucharest
  addNormalLine(44.4268, 26.1025);

  //frankfurt
  addNormalLine(50.1109, 8.6821);

  //kyiv
  addNormalLine(50.4501, 30.5234);

  //new york
  addNormalLine(40, -74);
}

function addDots() {
  const dotGeometry = new THREE.CircleGeometry(2, 12);

  const vector = new THREE.Vector3();
  const geometries = [];

  for (let i = DOT_COUNT; i >= 0; i--) {
    const phi = Math.acos(-1 + (2 * i) / DOT_COUNT);
    const theta = Math.sqrt(DOT_COUNT * Math.PI) * phi;

    vector.setFromSphericalCoords(DOT_SPHERE_RADIUS, phi, theta);
    const uv = spherePointToUV(vector);
    const sampledPixel = sampleImage(imageData, uv);
    
    if (sampledPixel[3]) {
      const clone = dotGeometry.clone();
      clone.lookAt(vector);
      clone.translate(vector.x, vector.y, vector.z);

      // Set a color for each vertex of the dotGeometry
      let dotColor = new THREE.Color(0x285d92);
      const colors = [];
      
      for (let j = 0; j < clone.attributes.position.count; j++) {
        colors.push(dotColor.r, dotColor.g, dotColor.b);
      }

      clone.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
      geometries.push(clone);
    }
  }

  const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
  const dotMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const mergedMesh = new THREE.Mesh(mergedGeometry, dotMaterial);

  scene.add(mergedMesh);
}

function render() {
  requestAnimationFrame( render );

  controls.update();
  stats.update();
  renderer.render(scene, camera);
};

async function loadImage(){
  const image = new Image();
  image.crossOrigin = "Anonymous"
  //image.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/World_map_blank_without_borders.svg/4378px-World_map_blank_without_borders.svg.png"
  image.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Equirectangular_projection_world_map_without_borders.svg/2560px-Equirectangular_projection_world_map_without_borders.svg.png"
  //image.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/10x10_checkered_board_transparent.svg/1024px-10x10_checkered_board_transparent.svg.png"
  //image.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Mercator_Projection.svg/1280px-Mercator_Projection.svg.png"

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
  
    addIndicators();
    addSphere();
    addDots();
    render();
  });
}
