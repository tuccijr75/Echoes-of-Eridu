export async function initGLBViewer(container){
  const status = document.createElement('div');
  status.className = 'view-status';
  status.textContent = 'Viewer booting…';
  container.appendChild(status);
  const setStatus = (html) => { status.innerHTML = html; };

  const canvas = container.querySelector('canvas') || container.appendChild(document.createElement('canvas'));

  async function tryImport(list, name){
    const tried = [];
    for (const u of list){
      try{ return await import(u); }catch(e){ tried.push(u); }
    }
    throw new Error(`Missing lib: ${name}<br><small>Tried: ${tried.join(', ')}</small>`);
  }

  const base = new URL('.', import.meta.url).href; // .../Echoes-of-Eridu/
  const local = p => [`./libs/${p}`, `${base}libs/${p}`, `/Echoes-of-Eridu/libs/${p}`];
  const cdn   = p => [`https://cdn.jsdelivr.net/npm/three@0.159.0/${p}`];
  const ex    = p => `examples/jsm/${p}`;

  let THREE, OrbitControls, GLTFLoader;
  try{
    THREE =              await tryImport([...local('three.module.js'),        ...cdn('build/three.module.js')], 'three.module.js');
    ({ OrbitControls } ) = await tryImport([...local('OrbitControls.js'), ...cdn(ex('controls/OrbitControls.js'))], 'OrbitControls.js');
    ({ GLTFLoader }  )   = await tryImport([...local('GLTFLoader.js'),    ...cdn(ex('loaders/GLTFLoader.js'))], 'GLTFLoader.js');
  }catch(e){
    setStatus('Local/CDN libraries not available.<br><small>'+e.message+'</small>');
    return;
  }

  try{
    const renderer = new THREE.WebGLRenderer({ antialias:true, canvas, alpha:true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene(); scene.background = null;
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
    camera.position.set(3, 1.8, 4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.06; controls.target.set(0,1,0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(4,6,8); scene.add(dir);

    const loader = new GLTFLoader();

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
      let size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
      if (!isFinite(size.x+size.y+size.z) || (size.x===0&&size.y===0&&size.z===0)){
        obj.updateMatrixWorld(true);
        box.setFromObject(obj); size = box.getSize(new THREE.Vector3()); center = box.getCenter(new THREE.Vector3());
      }
      const maxDim = Math.max(size.x,size.y,size.z)||1;
      const fov = camera.fov * Math.PI/180;
      const dist = (maxDim/2) / Math.tan(fov/2) * 1.4;
      camera.position.set(center.x + dist*0.3, center.y + maxDim*0.35, center.z + dist);
      controls.target.copy(center); controls.update();
      const scale = maxDim>1000 ? 0.01 : (maxDim<0.1 ? 50.0 : 1.0);
      if (scale !== 1.0) obj.scale.multiplyScalar(scale);
    }

    function resize(){
      const r = container.getBoundingClientRect();
      const w = Math.max(1, r.width), h = Math.max(1, r.height);
      const dpr = Math.min(window.devicePixelRatio||1, 2);
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(dpr);
      camera.aspect = w/h; camera.updateProjectionMatrix();
    }
    resize(); window.addEventListener('resize', resize);
    (function tick(){ requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); })();

    async function tryFetch(url){ try{ const r = await fetch(url,{cache:'no-cache'}); if(!r.ok) throw 0; return r; }catch(e){ return null; } }
    function clean(p){ return p.replace(/\/+/g,'/'); }
    function makeTryList(folder, name){ return [`${folder}${name}.glb`, `${folder}model.glb`, `${folder}character.glb`, `${folder}${name}.gltf`, `${folder}model.gltf`]; }

    async function loadFromFolderOrURL(folder, explicit){
      if (current){ scene.remove(current); disposeObject(current); current=null; }
      const tried = []; let url = null;
      if (explicit){ const u = clean(explicit); tried.push(u); if (await tryFetch(u)) url = u; }
      if (!url && folder){
        let f = clean(folder); if (!f.endsWith('/')) f += '/';
        const name = f.split('/').filter(Boolean).pop();
        const rel = makeTryList(f, name);
        const abs = makeTryList('/'+f.replace(/^\//,''), name);
        for (const t of [...rel, ...abs]){ tried.push(t); if (await tryFetch(t)) { url = t; break; } }
      }
      if (!url){ setStatus('Model not found.<br><small>Tried:<br>'+tried.map(x=>`<code>${x}</code>`).join('<br>')+'</small>'); return; }

      setStatus('Loading model…');
      loader.load(url, (g)=>{
        const node = g.scene || g.scenes?.[0];
        if (!node){ setStatus('Loaded file, but no scene.'); return; }
        current = node;
        current.traverse(o=>{ if(o.isMesh||o.isSkinnedMesh){ o.frustumCulled=false; o.castShadow=false; o.receiveShadow=false; } });
        scene.add(current); fit(current);
        setStatus('Model loaded ✓'); setTimeout(()=>status.remove(), 1500);
      }, undefined, (err)=>{
        setStatus('Failed to load model.<br><small>'+ (err?.message || err) +'</small>');
      });
    }

    const folder = container.dataset.folder || '';
    const file = container.dataset.model || '';
    setStatus('Viewer ready. Searching for model…');
    loadFromFolderOrURL(folder, file);

  }catch(e){
    setStatus('Viewer error.<br><small>'+ (e?.message || e) +'</small>');
  }
}
