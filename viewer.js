
// FBX viewer (Three.js) — minimal, themed for the existing layout
import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.159.0/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'https://unpkg.com/three@0.159.0/examples/jsm/loaders/FBXLoader.js';

export function initFBXViewer(container, initialSrc=null){
  const canvas = container.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({antialias:true, canvas, alpha:true});
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  camera.position.set(2.2, 1.6, 3.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 1, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 1.1);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(4, 6, 8);
  scene.add(dir);

  const loader = new FBXLoader();
  let current = null;

  function fitToObject(obj){
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim/2 / Math.tan(fov/2)) * 1.4;
    camera.position.set(center.x + cameraZ*0.3, center.y + maxDim*0.4, center.z + cameraZ);
    controls.target.copy(center);
    controls.update();
  }

  function clearCurrent(){
    if(current){
      scene.remove(current);
      current.traverse(c => { if(c.geometry) c.geometry.dispose(); if(c.material){ if(Array.isArray(c.material)) c.material.forEach(m=>m.dispose()); else c.material.dispose(); } });
      current = null;
    }
  }

  async function loadFBX(buf){
    clearCurrent();
    const obj = loader.parse(buf, '');
    scene.add(obj);
    current = obj;
    fitToObject(obj);
  }

  function handleFile(file){
    if(!file || !/\.fbx$/i.test(file.name)) return;
    const reader = new FileReader();
    reader.onload = e => loadFBX(e.target.result);
    reader.readAsArrayBuffer(file);
  }

  // Drag & drop
  container.addEventListener('dragover', e => { e.preventDefault(); container.classList.add('dragover'); });
  container.addEventListener('dragleave', e => { container.classList.remove('dragover'); });
  container.addEventListener('drop', e => {
    e.preventDefault(); container.classList.remove('dragover');
    if(e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  const fileInput = container.querySelector('input[type=file]');
  if(fileInput){
    fileInput.addEventListener('change', e => { if(e.target.files[0]) handleFile(e.target.files[0]); });
  }

  function resize(){
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  function animate(){
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  if(initialSrc){
    fetch(initialSrc).then(r => r.arrayBuffer()).then(loadFBX).catch(()=>{});
  }

  return { loadFBX, clear: clearCurrent };
}
