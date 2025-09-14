import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.159.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.159.0/examples/jsm/loaders/GLTFLoader.js';

async function tryFetch(url){ try{ const r = await fetch(url); if(!r.ok) throw 0; return r; }catch(e){ return null; } }

export async function initGLBViewer(container){
  const canvas = container.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ antialias:true, canvas, alpha:true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene(); scene.background = null;
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000);
  camera.position.set(2.2, 1.6, 3.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.06; controls.target.set(0,1,0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.15));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(4,6,8); scene.add(dir);

  const gltfLoader = new GLTFLoader();
  let current = null;

  function fit(obj){
    const box = new THREE.Box3().setFromObject(obj);
    if (!box.isEmpty()){
      const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fov = camera.fov * Math.PI / 180;
      const z = Math.abs(maxDim / 2 / Math.tan(fov/2)) * 1.4;
      const viewScale = 1.5;
      const zz = z / viewScale;
      camera.position.set(center.x + zz*0.3, center.y + maxDim*0.35, center.z + zz);
      controls.target.copy(center); controls.update();
    }
  }
  function clear(){
    if (!current) return;
    scene.remove(current);
    current.traverse(n => {
      if (n.geometry) n.geometry.dispose();
      if (n.material){
        (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => m.dispose && m.dispose());
      }
    });
    current = null;
  }
  function resize(){
    const r = container.getBoundingClientRect();
    renderer.setSize(Math.max(1,r.width), Math.max(1,r.height), false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);

  (function tick(){ requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); })();

  async function loadFromFolder(folder){
    clear();
    const trimmed = folder.replace(/\/+$/,'');
    const name = trimmed.split('/').pop();
    const tries = [
      `${trimmed}/${name}.glb`,
      `${trimmed}/model.glb`,
      `${trimmed}/character.glb`,
      `${trimmed}/${name}.gltf`,
      `${trimmed}/model.gltf`
    ];
    let url = null;
    for (const t of tries){ const r = await tryFetch(t); if (r){ url = t; break; } }
    if (!url){ console.warn('No GLB/GLTF found in', folder); return; }

    gltfLoader.load(url, g => {
      current = g.scene || g.scenes?.[0];
      if (!current) return;
      scene.add(current);
      fit(current);
    });
  }

  const folder = container.dataset.folder;
  if (folder) loadFromFolder(folder);
}
