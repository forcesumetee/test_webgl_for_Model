import * as THREE from 'https://esm.sh/three@0.150.1';
import { OrbitControls } from 'https://esm.sh/three@0.150.1/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/GLTFLoader';

// ===== Scene Setup =====
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.5, 3);

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('mainCanvas'),
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);

// ===== Controls =====
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ===== Lighting =====
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 20, 10);
scene.add(dirLight);

// ===== Fit Camera to Model =====
function fitCameraToObject(camera, object, offset = 1.5) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  const cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * offset;

  camera.position.set(center.x, center.y, cameraZ);
  camera.lookAt(center);
  camera.near = maxDim / 100;
  camera.far = maxDim * 100;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
}

// ===== Model Loading =====
let currentModel = null;
const loader = new GLTFLoader();

const input = document.getElementById('modelUpload');
const fileNameDisplay = document.getElementById('fileName');
const loadingMsg = document.getElementById('loadingMsg');
const scaleSlider = document.getElementById('scaleSlider');
const rotateYSlider = document.getElementById('rotateYSlider');
const lightSlider = document.getElementById('lightSlider');

input.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    fileNameDisplay.textContent = file.name;
    loadingMsg.classList.remove('hidden');

    const url = URL.createObjectURL(file);

    loader.load(
      url,
      (gltf) => {
        if (currentModel) scene.remove(currentModel);
        currentModel = gltf.scene;

        const box = new THREE.Box3().setFromObject(currentModel);
        const center = new THREE.Vector3();
        box.getCenter(center);
        currentModel.position.sub(center);

        const scale = parseFloat(scaleSlider.value);
        currentModel.scale.set(scale, scale, scale);

        scene.add(currentModel);
        fitCameraToObject(camera, currentModel);
        loadingMsg.classList.add('hidden');
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error);
        loadingMsg.textContent = 'Failed to load model.';
      }
    );
  }
});

// ===== Theme Toggle =====
const themeToggle = document.getElementById('themeToggle');
let isDark = true;

themeToggle.addEventListener('click', () => {
  isDark = !isDark;
  document.body.classList.toggle('day-mode', !isDark);
  themeToggle.textContent = isDark ? 'Switch to Day Mode' : 'Switch to Night Mode';
});

// ===== Sliders =====
scaleSlider.addEventListener('input', () => {
  if (currentModel) {
    const s = parseFloat(scaleSlider.value);
    currentModel.scale.set(s, s, s);
  }
});

rotateYSlider.addEventListener('input', () => {
  if (currentModel) {
    currentModel.rotation.y = parseFloat(rotateYSlider.value);
  }
});

lightSlider.addEventListener('input', () => {
  const intensity = parseFloat(lightSlider.value);
  hemiLight.intensity = intensity;
  dirLight.intensity = intensity;
});

// ===== Resize Handling =====
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== Animation Loop =====
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ===== Drag-to-Stretch Feature =====
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDragging = false;
let selectedMesh = null;

renderer.domElement.addEventListener('mousedown', (event) => {
  if (!currentModel) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(currentModel, true);

  if (intersects.length > 0) {
    selectedMesh = intersects[0].object;
    isDragging = true;
    document.body.style.cursor = 'ns-resize';
  }
});

renderer.domElement.addEventListener('mousemove', (event) => {
  if (isDragging && selectedMesh) {
    const deltaY = event.movementY * -0.01;
    selectedMesh.scale.y += deltaY;
    selectedMesh.scale.y = Math.max(0.1, Math.min(5, selectedMesh.scale.y));
  }
});

renderer.domElement.addEventListener('mouseup', () => {
  isDragging = false;
  selectedMesh = null;
  document.body.style.cursor = 'default';
});
