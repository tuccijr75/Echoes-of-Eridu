import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.159.0/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'https://unpkg.com/three@0.159.0/examples/jsm/loaders/FBXLoader.js';

/** Utility: build candidate file list for a texture kind */
function candidates(folder, base){
  const exts = ['png','jpg','jpeg','webp'];
  const names = {
    albedo:   ['albedo','basecolor','base_color','color','diffuse','bc'],
    normal:   ['normal','norm','nrm'],
    roughness:['roughness','rough','rgh'],
    metallic: ['metallic','metalness','mtl'],
    ao:       ['ao','occlusion','ambientocclusion']
  }[base];
  const out = [];
  names.forEach(n => exts.forEach(e => out.push(`${folder}${n}.${e}`)));
  return out;
}

async function tryFetch(url){
  try{ const res = await fetch(url); if(!res.ok) throw 0; return res; } catch(e){ return null; }
}

/** Resolve the first existing URL from a list */
async function resolveFirst(list){
  for(const u of list){
    const r = await tryFetch(u);
    if(r) return u;
  }
  return null;
}

export async function initFBXViewer(container){
  const canvas = container.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({antialias:true, canvas, alpha:true});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  camera.position.set(2.2, 1.6, 3.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.06; controls.target.set(0,1,0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(4,6,8); scene.add(dir);

  const loader = new FBXLoader();
  const texLoader = new THREE.TextureLoader();

  let current = null;
  function fit(obj){
    const b = new THREE.Box3().setFromObject(obj);
    const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const m = Math.max(s.x,s.y,s.z)||1; const f = camera.fov*Math.PI/180;
    const z = Math.abs(m/2/Math.tan(f/2))*1.4;
    camera.position.set(c.x+z*0.3, c.y+m*0.4, c.z+z); controls.target.copy(c); controls.update();
  }
  function clear(){ if(!current) return;
    scene.remove(current);
    current.traverse(n=>{ if(n.geometry) n.geometry.dispose(); if(n.material){ (Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose()); } });
    current = null;
  }

  function loadMap(path, isColor=false){
    if(!path) return null;
    const t = texLoader.load(path);
    if(isColor) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function applyMaps(root, maps){
    root.traverse(obj => {
      if(!obj.isMesh) return;
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      if(maps.map) mat.map = maps.map;
      if(maps.normalMap) mat.normalMap = maps.normalMap;
      if(maps.roughnessMap) mat.roughnessMap = maps.roughnessMap;
      if(maps.metalnessMap) mat.metalnessMap = maps.metalnessMap;
      if(maps.aoMap) { mat.aoMap = maps.aoMap; obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv); }
      // Good skin defaults if maps are missing
      if(!maps.metalnessMap) mat.metalness = 0.0;
      if(!maps.roughnessMap) mat.roughness = 0.6;
      obj.material = mat; obj.material.needsUpdate = true;
    });
  }

  async function resolveMaps(folder){
    const explicit = {
      map:        container.dataset.albedo || null,
      normalMap:  container.dataset.normal || null,
      roughnessMap: container.dataset.roughness || null,
      metalnessMap: container.dataset.metallic || null,
      aoMap:      container.dataset.ao || null
    };
    const haveExplicit = Object.values(explicit).some(Boolean);
    if(haveExplicit){
      return {
        map: loadMap(explicit.map, true),
        normalMap: loadMap(explicit.normalMap),
        roughnessMap: loadMap(explicit.roughnessMap),
        metalnessMap: loadMap(explicit.metalnessMap),
        aoMap: loadMap(explicit.aoMap)
      };
    }
    // Auto naming: look for common filenames inside folder
    const mapURL   = await resolveFirst(candidates(folder, 'albedo'));
    const normURL  = await resolveFirst(candidates(folder, 'normal'));
    const roughURL = await resolveFirst(candidates(folder, 'roughness'));
    const metalURL = await resolveFirst(candidates(folder, 'metallic'));
    const aoURL    = await resolveFirst(candidates(folder, 'ao'));
    return {
      map: loadMap(mapURL, true),
      normalMap: loadMap(normURL),
      roughnessMap: loadMap(roughURL),
      metalnessMap: loadMap(metalURL),
      aoMap: loadMap(aoURL)
    };
  }

  async function loadFromFolder(folder){
    clear();
    // FBX name convention: <folderName>.fbx (e.g., models/adamu/adamu.fbx)
    const parts = folder.replace(/\/+$/,'').split('/');
    const basename = parts[parts.length-1];
    const fbx = await resolveFirst([`${folder}${basename}.fbx`, `${folder}model.fbx`, `${folder}${basename}.FBX`]);
    if(!fbx){ console.warn('No FBX found in', folder); return; }
    const buf = await fetch(fbx).then(r=>r.arrayBuffer());
    const obj = loader.parse(buf, '');
    current = obj; scene.add(obj);
    const maps = await resolveMaps(folder);
    applyMaps(obj, maps);
    fit(obj);
  }

  function handleFile(file){
    if(!file || !/\.fbx$/i.test(file.name)) return;
    const r = new FileReader(); r.onload = e => {
      clear();
      const obj = loader.parse(e.target.result, '');
      current = obj; scene.add(obj);
      applyMaps(obj, { }); // no maps when dropping, user just previews geometry
      fit(obj);
    }; r.readAsArrayBuffer(file);
  }

  // Drag & drop
  container.addEventListener('dragover', e => { e.preventDefault(); container.classList.add('dragover'); });
  container.addEventListener('dragleave', () => container.classList.remove('dragover'));
  container.addEventListener('drop', e => {
    e.preventDefault(); container.classList.remove('dragover');
    if(e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  });

  const fileInput = container.querySelector('input[type=file]');
  if(fileInput){ fileInput.addEventListener('change', e => e.target.files[0] && handleFile(e.target.files[0])); }

  function resize(){
    const r = container.getBoundingClientRect();
    renderer.setSize(Math.max(1,r.width), Math.max(1,r.height), false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);

  (function tick(){ requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); })();

  // Auto load folder
  const folder = container.dataset.folder;   // e.g., "../models/adamu/"
  if(folder){ loadFromFolder(folder); }
}