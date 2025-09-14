import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.159.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.159.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://unpkg.com/three@0.159.0/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'https://unpkg.com/three@0.159.0/examples/jsm/loaders/KTX2Loader.js';
import { RoomEnvironment } from 'https://unpkg.com/three@0.159.0/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'https://unpkg.com/meshoptimizer/meshopt_decoder.module.js';

function banner(el, html){
  const b = document.createElement('div');
  b.style.cssText = 'position:absolute;inset:auto 8px 8px 8px;padding:10px 12px;border:1px solid rgba(212,175,55,.35);border-radius:12px;background:rgba(10,12,16,.82);color:#ffd;z-index:12;font:600 14px/1.3 ui-sans-serif,system-ui;max-width:96%';
  b.innerHTML = html; el.appendChild(b);
}
async function tryFetch(url){
  try{ const r = await fetch(url,{cache:'no-cache'}); if(!r.ok) throw 0; return r; }catch(e){ return null; }
}

export async function initGLBViewer(container){
  const canvas = container.querySelector('canvas') || container.appendChild(document.createElement('canvas'));
  const renderer = new THREE.WebGLRenderer({ antialias:true, canvas, alpha:true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene(); scene.background = null;
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
  camera.position.set(3, 1.8, 4);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.08).texture;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.06; controls.target.set(0,1,0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 0.6); scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(4,6,8); scene.add(dir);

  const gltfLoader = new GLTFLoader();
  const draco = new DRACOLoader(); draco.setDecoderPath('https://unpkg.com/three@0.159.0/examples/jsm/libs/draco/'); gltfLoader.setDRACOLoader(draco);
  const ktx2 = new KTX2Loader(); ktx2.setTranscoderPath('https://unpkg.com/three@0.159.0/examples/jsm/libs/basis/'); ktx2.detectSupport(renderer); gltfLoader.setKTX2Loader(ktx2);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  let current = null;
  function disposeObject(obj){
    obj.traverse(n=>{
      if(n.geometry) n.geometry.dispose();
      if(n.material){
        const list = Array.isArray(n.material)? n.material : [n.material];
        list.forEach(m=>{
          for(const k of ['map','normalMap','metalnessMap','roughnessMap','aoMap','emissiveMap']) if(m[k]) m[k].dispose();
          m.dispose && m.dispose();
        });
      }
    });
  }

  function fit(obj){
    const box = new THREE.Box3().setFromObject(obj);
    let size = box.getSize(new THREE.Vector3());
    let center = box.getCenter(new THREE.Vector3());
    if (!isFinite(size.x+size.y+size.z) || (size.x===0&&size.y===0&&size.z===0)){
      obj.updateMatrixWorld(true);
      box.setFromObject(obj); size = box.getSize(new THREE.Vector3()); center = box.getCenter(new THREE.Vector3());
    }
    const maxDim = Math.max(size.x,size.y,size.z) || 1;
    const fov = camera.fov * Math.PI/180;
    const dist = (maxDim/2) / Math.tan(fov/2);
    const z = dist * 1.4;
    camera.position.set(center.x + z*0.3, center.y + maxDim*0.35, center.z + z);
    controls.target.copy(center); controls.update();
    const scale = maxDim>1000 ? 0.01 : (maxDim<0.1 ? 50.0 : 1.0);
    if (scale !== 1.0) obj.scale.multiplyScalar(scale);
  }

  function resize(){
    const r = container.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);
  (function tick(){ requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); })();

  function clean(p){ return p.replace(/\/+/g,'/'); }
  function makeTryList(folder, name){
    return [`${folder}${name}.glb`, `${folder}model.glb`, `${folder}character.glb`, `${folder}${name}.gltf`, `${folder}model.gltf`];
  }

  async function loadFromFolderOrURL(folder, explicit){
    if (current){ scene.remove(current); disposeObject(current); current=null; }
    const tried = []; let url = null;

    if (explicit){
      const u = clean(explicit); tried.push(u);
      if (await tryFetch(u)) url = u;
    }

    if (!url && folder){
      let f = clean(folder); if (!f.endsWith('/')) f += '/';
      const name = f.split('/').filter(Boolean).pop();
      const rel = makeTryList(f, name);
      const abs = makeTryList('/'+f.replace(/^\//,''), name);
      for (const t of [...rel, ...abs]){ tried.push(t); if (await tryFetch(t)) { url = t; break; } }
    }

    if (!url){
      banner(container, 'Model not found.<br><small>Tried:<br>'+tried.map(x=>`<code>${x}</code>`).join('<br>')+'</small>');
      console.warn('GLB tried URLs:', tried);
      return;
    }

    gltfLoader.load(url, (g)=>{
      current = g.scene || g.scenes?.[0];
      if (!current){ banner(container, 'Loaded file, but no scene.'); return; }
      current.traverse(o=>{ if(o.isMesh||o.isSkinnedMesh){ o.frustumCulled=false; o.castShadow=false; o.receiveShadow=false; } });
      scene.add(current); fit(current);
    }, undefined, (err)=>{
      banner(container, 'Failed to load model.<br><small>'+ (err?.message || err) +'</small>');
      console.error('GLB load error:', err);
    });
  }

  const folder = container.dataset.folder || '';
  const file = container.dataset.model || '';
  loadFromFolderOrURL(folder, file);
}
