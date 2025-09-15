// viewer.js — GLB viewer (no CDN, Three r159) using import.meta.url-safe imports
export async function initGLBViewer(container){
  const status = document.createElement('div');
  status.className = 'view-status';
  status.textContent = 'Viewer booting…';
  container.appendChild(status);
  const setStatus = (html) => { status.innerHTML = html; };

  const canvas = container.querySelector('canvas') || container.appendChild(document.createElement('canvas'));

  // Resolve a module path relative to THIS file
  const rel = (p) => new URL(p, import.meta.url).href;

  async function need(relativePath, name){
    const url = rel(relativePath);
    try { return await import(url); }
    catch(e){ throw new Error(`Missing local lib: ${name} (<code>${url}</code>)`); }
  }

  try {
    // ---- Local libs (absolute to viewer.js) ----
    const THREE               = await need('./libs/three.module.js',    'three.module.js');
    const { OrbitControls }   = await need('./libs/OrbitControls.js',   'OrbitControls.js');
    const { GLTFLoader }      = await need('./libs/GLTFLoader.js',      'GLTFLoader.js');
    const { DRACOLoader }     = await need('./libs/DRACOLoader.js',     'DRACOLoader.js');
    const { KTX2Loader }      = await need('./libs/KTX2Loader.js',      'KTX2Loader.js');
    const { RoomEnvironment } = await need('./libs/RoomEnvironment.js', 'RoomEnvironment.js');

    // Optional meshopt (safe if missing)
    let MeshoptDecoder = null;
    try { MeshoptDecoder = (await import(rel('./libs/meshopt_decoder.module.js'))).MeshoptDecoder || null; } catch {}

    // ---- Three setup ----
    const renderer = new THREE.WebGLRenderer({ antialias:true, canvas, alpha:true });
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene(); scene.background = null;
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
    camera.position.set(3, 1.8, 4);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.08).texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.06; controls.target.set(0,1,0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(4,6,8); scene.add(dir);

    // ---- GLTF loader with DRACO/KTX2/Meshopt ----
    const loader = new GLTFLoader();

    const draco = new DRACOLoader();
    draco.setDecoderPath(rel('./libs/draco/'));       // must end with slash
    loader.setDRACOLoader(draco);

    const ktx2 = new KTX2Loader().setTranscoderPath(rel('./libs/basis/'));
    ktx2.detectSupport(renderer);
    loader.setKTX2Loader(ktx2);

    if (MeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);

    // ---- Utilities ----
    let current = null;
    function disposeObject(obj){
      obj.traverse(n=>{
        if(n.geometry) n.geometry.dispose();
        if(n.material){
          const list = Array.isArray(n.material) ? n.material : [n.material];
          list.forEach(m=>{
            ['map','normalMap','metalnessMap','roughnessMap','aoMap','emissiveMap'].forEach(k=>{
              if (m[k]) m[k].dispose();
            });
            m.dispose && m.dispose();
          });
        }
      });
    }

    function fit(obj){
      const box = new THREE.Box3().setFromObject(obj);
      let size = box.getSize(new THREE.Vector3());
      let center = box.getCenter(new THREE.Vector3());
      if (!isFinite(size.x+size.y+size.z) || (size.x===0 && size.y===0 && size.z===0)) {
        obj.updateMatrixWorld(true);
        box.setFromObject(obj);
        size = box.getSize(new THREE.Vector3());
        center = box.getCenter(new THREE.Vector3());
      }
      const maxDim = Math.max(size.x,size.y,size.z) || 1;
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
    (function loop(){ requestAnimationFrame(loop); controls.update(); renderer.render(scene,camera); })();

    // ---- Load model ----
    async function tryFetch(url){ try{ const r = await fetch(url,{cache:'no-cache'}); if(!r.ok) throw 0; return r; }catch{ return null; } }
    const clean = (p)=> p.replace(/\/+/g,'/');
    const tryList = (folder,name)=>[
      `${folder}${name}.glb`, `${folder}model.glb`, `${folder}character.glb`,
      `${folder}${name}.gltf`, `${folder}model.gltf`
    ];

    async function loadFromFolderOrURL(folder, explicit){
      if (current){ scene.remove(current); disposeObject(current); current=null; }
      const tried = []; let url = null;

      if (explicit){ const u = clean(explicit); tried.push(u); if (await tryFetch(u)) url = u; }
      if (!url && folder){
        let f = clean(folder); if (!f.endsWith('/')) f += '/';
        const name = f.split('/').filter(Boolean).pop();
        for (const t of [...tryList(f,name), ...tryList('/'+f.replace(/^\//,''), name)]){
          tried.push(t); if (await tryFetch(t)) { url = t; break; }
        }
      }
      if (!url){
        setStatus('Model not found.<br><small>Tried:<br>'+ tried.map(x=>'<code>'+x+'</code>').join('<br>') +'</small>');
        return;
      }

      setStatus('Loading model…');
      loader.load(url, (g)=>{
        const node = g.scene || (g.scenes && g.scenes[0]);
        if (!node){ setStatus('Loaded file, but no scene.'); return; }
        current = node;
        current.traverse(o=>{ if(o.isMesh||o.isSkinnedMesh){ o.frustumCulled=false; o.castShadow=false; o.receiveShadow=false; } });
        scene.add(current);
        fit(current);
        setStatus('Model loaded ✓'); setTimeout(()=>status.remove(), 1500);
      }, undefined, (err)=>{
        setStatus('Failed to load model.<br><small>'+ (err && err.message ? err.message : err) +'</small>');
      });
    }

    const folder = container.dataset.folder || '';
    const file   = container.dataset.model  || '';
    setStatus('Viewer ready. Searching for model…');
    loadFromFolderOrURL(folder, file);

  } catch(e){
    setStatus('Viewer error.<br><small>'+ (e && e.message ? e.message : e) +'</small>');
  }
}
