import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getSunLatitudeAndLongitude, latLonToXYZ, sampleImage, spherePointToUV } from './utils';
import Stats from 'three/addons/libs/stats.module.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

interface IndicatorPlace {
  name: string;
  lat: number;
  lon: number;
}

export interface AnbuGlobeConfig {
  indicators?: IndicatorPlace[];
}

export class AnbuGlobe {
  private renderer: THREE.WebGL1Renderer;
  private light: THREE.DirectionalLight;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private stats: Stats;
  private raycaster = new THREE.Raycaster();
  private scene = new THREE.Scene();
  private pointer = {
    pos: new THREE.Vector2(),
    normalizedPos: new THREE.Vector2(),
  };
  private intersectionObjects: THREE.Mesh[] = [];
  private intersectionDetailsMap: Map<unknown, string | undefined> = new Map<unknown, string | undefined>();
  private intersectedObject: unknown;

  readonly SPHERE_RADIUS = 600;
  readonly DOT_COUNT = 200000;
  readonly DOT_SPHERE_RADIUS = this.SPHERE_RADIUS + 5;

  // holds the image that is used to mask the dots in whatever shape
  private imageData: ImageData;

  public async init({ indicators }: AnbuGlobeConfig) {
    this.initRenderer();
    this.initLight();
    this.initCamera();
    this.initStats();
    this.initOrbitControls();
    await this.loadImage();

    this.addSphere();
    this.addDots();
    this.addIndicators(indicators);
    this.render();

    window.addEventListener('pointermove', this.onPointerMove.bind(this));
  }

  private initRenderer() {
    this.renderer = new THREE.WebGL1Renderer();
    this.renderer.setClearColor('#000000');
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('app')?.appendChild(this.renderer.domElement);
  }

  private initLight() {
    this.light = new THREE.DirectionalLight(0xffffff, 3);
    const sun = getSunLatitudeAndLongitude(new Date());
    this.setLightPosition(sun.latitude, sun.longitude);
    this.scene.add(this.light);
  }

  private initCamera() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3200);
    this.camera.position.set(1000, 600, 200); // start from europe
  }

  private initStats() {
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
  }

  private initOrbitControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed *= -0.2;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
  }

  private setLightPosition(lat: number, lon: number) {
    const { x, y, z } = latLonToXYZ(lat, lon, this.SPHERE_RADIUS * 2);

    this.light.position.set(x, z, y);
  }

  private addSphere() {
    const geometry = new THREE.SphereGeometry(this.SPHERE_RADIUS, 256, 256);
    const material = new THREE.MeshPhongMaterial({
      color: '#0f284c',
      opacity: 0.95,
      transparent: true,
      shininess: 2,
    });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.set(0, 0, 0);
    this.scene.add(sphere);
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

  private addIndicator(lat: number, lon: number, details?: string) {
    const dotGeometry = new THREE.CircleGeometry(5, 12);
    const dotMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(dotGeometry, dotMaterial);

    const { x, y, z } = latLonToXYZ(lat, -lon, this.DOT_SPHERE_RADIUS + 1);

    mesh.lookAt(x, z, y);
    mesh.position.set(x, z, y);

    this.intersectionObjects.push(mesh);
    this.intersectionDetailsMap.set(mesh, details);

    this.scene.add(mesh);
  }

  private addIndicators(indicators?: IndicatorPlace[]) {
    for (let indicator of indicators || []) {
      this.addIndicator(indicator.lat, indicator.lon, indicator.name);
    }
  }

  private addDots() {
    const dotGeometry = new THREE.CircleGeometry(2, 12);

    const vector = new THREE.Vector3();
    const geometries = [];

    for (let i = this.DOT_COUNT; i >= 0; i--) {
      const phi = Math.acos(-1 + (2 * i) / this.DOT_COUNT);
      const theta = Math.sqrt(this.DOT_COUNT * Math.PI) * phi;

      vector.setFromSphericalCoords(this.DOT_SPHERE_RADIUS, phi, theta);
      const uv = spherePointToUV(vector);
      const sampledPixel = sampleImage(this.imageData, uv);

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
    const dotMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    const mergedMesh = new THREE.Mesh(mergedGeometry, dotMaterial);

    this.scene.add(mergedMesh);
  }

  private render() {
    requestAnimationFrame(this.render.bind(this));

    this.checkIntersections();
    this.controls.update();
    this.stats.update();
    this.renderer.render(this.scene, this.camera);
  }

  private async loadImage() {
    return new Promise((r) => {
      const image = new Image();
      image.crossOrigin = 'Anonymous';
      image.src = 'eq_proj.png';

      image.onload = () => {
        // Create an HTML canvas, get its context and draw the image on it.
        const tempCanvas = document.createElement('canvas');

        tempCanvas.width = image.width;
        tempCanvas.height = image.height;

        const ctx = tempCanvas.getContext('2d');

        if (!ctx) {
          throw new Error('could not get 2d context');
        }

        ctx.drawImage(image, 0, 0);

        // Read the image data from the canvas context.
        const imgData = ctx.getImageData(0, 0, image.width, image.height);
        this.imageData = imgData;

        r('');
      };
    });
  }

  private onPointerMove(event: MouseEvent) {
    this.pointer.pos.x = event.offsetX;
    this.pointer.pos.y = event.offsetY;

    // this really only should move the tooltip, but fine for now
    if (this.intersectedObject) {
      this.showTooltip();
    } else {
      this.hideTooltip();
    }
  }

  private checkIntersections() {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components
    this.pointer.normalizedPos.x = (this.pointer.pos.x / this.renderer.domElement.width) * 2 - 1;
    this.pointer.normalizedPos.y = -(this.pointer.pos.y / this.renderer.domElement.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer.normalizedPos, this.camera);
    const intersects = this.raycaster.intersectObjects(this.intersectionObjects, false);

    // should execute only once when mouse enters the intersected object
    if (intersects.length > 0 && intersects[0].object !== this.intersectedObject) {
      this.controls.autoRotate = false;
      this.intersectedObject = intersects[0].object;
      this.showTooltip();
    }

    // should execute only once when mouse leaves the intersected object
    if (intersects.length === 0 && this.intersectedObject) {
      this.intersectedObject = undefined;
      this.controls.autoRotate = true;
      this.hideTooltip();
    }
  }

  private showTooltip() {
    const element = document.getElementById('tooltip-info');

    if (element) {
      element.style.display = 'inline';
      element.style.left = `${this.pointer.pos.x + 10}px`;
      element.style.top = `${this.pointer.pos.y + 10}px`;
      element.innerHTML = this.intersectionDetailsMap.get(this.intersectedObject) || '';
    }
  }

  private hideTooltip() {
    const element = document.getElementById('tooltip-info');
    if (element) {
      element.style.display = 'none';
    }
  }
}
