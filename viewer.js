
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
  controls.enableDamping = true; controls.dampingFactor = 0.06; controls.target.set(0,1,0);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 1.1); scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(4,6,8); scene.add(dir);
  const loader = new FBXLoader(); let current=null;
  function fit(obj){ const b=new THREE.Box3().setFromObject(obj); const s=b.getSize(new THREE.Vector3()); const c=b.getCenter(new THREE.Vector3());
    const m=Math.max(s.x,s.y,s.z)||1; const f=camera.fov*(Math.PI/180); const z=Math.abs(m/2/Math.tan(f/2))*1.4;
    camera.position.set(c.x+z*0.3,c.y+m*0.4,c.z+z); controls.target.copy(c); controls.update(); }
  function clear(){ if(current){ scene.remove(current); current.traverse(n=>{ if(n.geometry) n.geometry.dispose(); if(n.material){ Array.isArray(n.material)?n.material.forEach(m=>m.dispose()):n.material.dispose(); } }); current=null; } }
  function loadFBX(buf){ clear(); const obj=loader.parse(buf,''); current=obj; scene.add(obj); fit(obj); }
  function handle(file){ if(!file||!/\.fbx$/i.test(file.name)) return; const r=new FileReader(); r.onload=e=>loadFBX(e.target.result); r.readAsArrayBuffer(file); }
  container.addEventListener('dragover', e=>{e.preventDefault(); container.classList.add('dragover');});
  container.addEventListener('dragleave', e=>{container.classList.remove('dragover');});
  container.addEventListener('drop', e=>{e.preventDefault(); container.classList.remove('dragover'); if(e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]);});
  const fileInput=container.querySelector('input[type=file]'); if(fileInput){ fileInput.addEventListener('change', e=>{ if(e.target.files[0]) handle(e.target.files[0]);});}
  function resize(){ const r=container.getBoundingClientRect(); const w=Math.max(1,r.width), h=Math.max(1,r.height);
    renderer.setSize(w,h,false); renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); camera.aspect=w/h; camera.updateProjectionMatrix(); }
  resize(); window.addEventListener('resize', resize);
  (function ani(){ requestAnimationFrame(ani); controls.update(); renderer.render(scene,camera); })();
  if(initialSrc){ fetch(initialSrc).then(r=>r.arrayBuffer()).then(loadFBX).catch(()=>{}); }
  return { loadFBX, clear };
}
