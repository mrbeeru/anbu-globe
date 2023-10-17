import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
  getSunLatitudeAndLongitude,
  latLonToXYZ,
  sampleImage,
  spherePointToUV,
} from './utils'
import Stats from 'three/addons/libs/stats.module.js'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'

let renderer: THREE.WebGL1Renderer
let scene = new THREE.Scene()
let light: THREE.DirectionalLight
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let stats: Stats
const raycaster = new THREE.Raycaster()
const pointer = {pos: new THREE.Vector2(), normalizedPos: new THREE.Vector2()}
const intersectionObjects: THREE.Mesh[] = []
const intersectionDetailsMap: Map<unknown, string | undefined> = new Map<unknown, string | undefined>();

const SPHERE_RADIUS = 600
const DOT_COUNT = 200000
const DOT_SPHERE_RADIUS = SPHERE_RADIUS + 30

// holds the image that is used to mask the dots in whatever shape
let imageData: ImageData

init()

async function init() {
  initRenderer()
  initLight()
  initCamera()
  initStats()
  initOrbitControls()
  await loadImage()

  addIndicators()
  addSphere()
  addDots()
  render()

  window.addEventListener('pointermove', onPointerMove)
}

function initRenderer() {
  renderer = new THREE.WebGL1Renderer()
  renderer.setClearColor('#000000')
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.getElementById('app')?.appendChild(renderer.domElement)
}

function initLight() {
  light = new THREE.DirectionalLight(0xffffff, 3)
  const sun = getSunLatitudeAndLongitude(new Date())
  setLightPosition(sun.latitude, sun.longitude)
  scene.add(light)
}

function initCamera() {
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    3200
  )
  camera.position.set(1000, 600, 200) // start from europe
}

function initStats() {
  stats = new Stats()
  document.body.appendChild(stats.dom)
}

function initOrbitControls() {
  controls = new OrbitControls(camera, renderer.domElement)
  controls.autoRotate = true
  controls.autoRotateSpeed *= -0.2
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enablePan = false;
}

function setLightPosition(lat: number, lon: number) {
  const { x, y, z } = latLonToXYZ(lat, lon, SPHERE_RADIUS * 2)

  light.position.set(x, z, y)
}

function addSphere() {
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 256, 256)
  const material = new THREE.MeshPhongMaterial({
    color: '#0f284c',
    opacity: 0.95,
    transparent: true,
    shininess: 2,
  })
  const sphere = new THREE.Mesh(geometry, material)

  sphere.position.set(0, 0, 0)
  scene.add(sphere)
}

// function addNormalLine(lat: number, lon: number) {
//   const { x, y, z } = latLonToXYZ(lat, -lon, SPHERE_RADIUS)

//   const points = []
//   points.push(new THREE.Vector3(x, z, y))
//   points.push(new THREE.Vector3(x * 1.2, z * 1.2, y * 1.2))

//   const tubeGeometry = new THREE.TubeGeometry(
//     new THREE.CatmullRomCurve3(points),
//     points.length * 10,
//     1,
//     8,
//     false
//   )
//   const material = new THREE.LineBasicMaterial({
//     color: 0x0000ff,
//     linewidth: 22,
//   })
//   const line = new THREE.Line(tubeGeometry, material)

//   scene.add(line)
// }

function addIndicator(lat: number, lon: number, details?: string) {
  const dotGeometry = new THREE.CircleGeometry(5, 12)
  const dotMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(dotGeometry, dotMaterial)

  const { x, y, z } = latLonToXYZ(lat, -lon, DOT_SPHERE_RADIUS + 1)

  mesh.lookAt(x, z, y)
  mesh.position.set(x, z, y)

  intersectionObjects.push(mesh)
  intersectionDetailsMap.set(mesh, details)

  scene.add(mesh)
}

function addIndicators() {
  //poles
  //addNormalLine(90, 0);
  //addNormalLine(-90, 0);

  //hawai
  //addNormalLine(19.64, -155.517);

  //london
  //addNormalLine(51.5072, -0.1276);

  //bucharest
  //addNormalLine(44.4268, 26.1025);
  addIndicator(44.4268, 26.1025, "Bucharest")
  
  //frankfurt
  //addNormalLine(50.1109, 8.6821);
   addIndicator(50.1109, 8.6821, "Frankfurt")
  
  //kyiv
  //addNormalLine(50.4501, 30.5234);
  addIndicator(50.4501, 30.5234, "Kyiv")

  //new york
  //addNormalLine(40, -74);
}

function addDots() {
  const dotGeometry = new THREE.CircleGeometry(2, 12)

  const vector = new THREE.Vector3()
  const geometries = []

  for (let i = DOT_COUNT; i >= 0; i--) {
    const phi = Math.acos(-1 + (2 * i) / DOT_COUNT)
    const theta = Math.sqrt(DOT_COUNT * Math.PI) * phi

    vector.setFromSphericalCoords(DOT_SPHERE_RADIUS, phi, theta)
    const uv = spherePointToUV(vector)
    const sampledPixel = sampleImage(imageData, uv)

    if (sampledPixel[3]) {
      const clone = dotGeometry.clone()
      clone.lookAt(vector)
      clone.translate(vector.x, vector.y, vector.z)

      // Set a color for each vertex of the dotGeometry
      let dotColor = new THREE.Color(0x285d92)
      const colors = []

      for (let j = 0; j < clone.attributes.position.count; j++) {
        colors.push(dotColor.r, dotColor.g, dotColor.b)
      }

      clone.setAttribute(
        'color',
        new THREE.BufferAttribute(new Float32Array(colors), 3)
      )
      geometries.push(clone)
    }
  }

  const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries)
  const dotMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  })
  const mergedMesh = new THREE.Mesh(mergedGeometry, dotMaterial)

  scene.add(mergedMesh)
}

function render() {
  requestAnimationFrame(render)

 
  checkIntersections();
  controls.update()
  stats.update()
  renderer.render(scene, camera)
}

async function loadImage() {
  return new Promise((r) => {
    const image = new Image()
    image.crossOrigin = 'Anonymous'
    image.src = 'eq_proj.png'

    image.onload = () => {
      // Create an HTML canvas, get its context and draw the image on it.
      const tempCanvas = document.createElement('canvas')

      tempCanvas.width = image.width
      tempCanvas.height = image.height

      const ctx = tempCanvas.getContext('2d')

      if (!ctx) {
        throw new Error('could not get 2d context')
      }

      ctx.drawImage(image, 0, 0)

      // Read the image data from the canvas context.
      const imgData = ctx.getImageData(0, 0, image.width, image.height)
      imageData = imgData

      r('')
    }
  })
}

function onPointerMove(event: MouseEvent) {
  pointer.pos.x = event.offsetX;
  pointer.pos.y = event.offsetY;
}

function checkIntersections() {
  // calculate pointer position in normalized device coordinates
  // (-1 to +1) for both components
  pointer.normalizedPos.x = (pointer.pos.x / renderer.domElement.width) * 2 - 1
  pointer.normalizedPos.y = -(pointer.pos.y / renderer.domElement.height) * 2 + 1

  raycaster.setFromCamera(pointer.normalizedPos , camera)
  const intersects = raycaster.intersectObjects(intersectionObjects, false)

  if (intersects.length > 0) {
    controls.autoRotate = false;

    const element = document.getElementById('tooltip-info')

    if (element) {
      element.style.display = 'inline'
      element.style.left = `${pointer.pos.x + 10}px`
      element.style.top = `${pointer.pos.y + 10}px`
      element.innerHTML = intersectionDetailsMap.get(intersects[0].object) || 'asd';
    }
  } else {
    const element = document.getElementById('tooltip-info')
    controls.autoRotate = true;
    if (element) {
      element.style.display = 'none'
    }
  }
}
