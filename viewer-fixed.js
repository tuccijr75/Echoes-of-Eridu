export async function initGLBViewer(container){
  const status = document.createElement('div');
  status.className = 'view-status';
  status.textContent = 'Viewer booting…';
  container.appendChild(status);
  const setStatus = (html) => { 
    status.innerHTML = html; 
    console.log('Viewer Status:', html.replace(/<[^>]*>/g, ''));
  };

  const canvas = container.querySelector('canvas') || container.appendChild(document.createElement('canvas'));

  async function tryImport(list, name){
    const tried = [];
    for (const u of list){
      try{ 
        console.log(`Trying to import ${name} from: ${u}`);
        const result = await import(u); 
        console.log(`✓ Successfully imported ${name} from: ${u}`);
        return result;
      }catch(e){ 
        console.log(`✗ Failed to import ${name} from ${u}: ${e.message}`);
        tried.push(u); 
      }
    }
    throw new Error(`Missing lib: ${name}<br><small>Tried: ${tried.join(', ')}</small>`);
  }

  const base = new URL('.', import.meta.url).href;
  console.log('Base URL:', base);
  const local = p => [`./libs/${p}`, `${base}libs/${p}`, `/Echoes-of-Eridu/libs/${p}`];
  const cdn   = p => [`https://cdn.jsdelivr.net/npm/three@0.159.0/${p}`];
  const ex    = p => `examples/jsm/${p}`;

  let THREE, OrbitControls, GLTFLoader;
  try{
    console.log('Loading Three.js libraries...');
    THREE =              await tryImport([...local('three.module.js'),        ...cdn('build/three.module.js')], 'three.module.js');
    ({ OrbitControls } ) = await tryImport([...local('OrbitControls.js'), ...cdn(ex('controls/OrbitControls.js'))], 'OrbitControls.js');
    ({ GLTFLoader }  )   = await tryImport([...local('GLTFLoader.js'),    ...cdn(ex('loaders/GLTFLoader.js'))], 'GLTFLoader.js');
    console.log('✓ All libraries loaded successfully');
  }catch(e){
    console.error('✗ Library loading failed:', e);
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

    async function tryFetch(url){ 
      try{ 
        console.log(`Trying to fetch: ${url}`);
        const r = await fetch(url,{cache:'no-cache'}); 
        if(!r.ok) {
          console.log(`✗ Fetch failed: ${r.status} ${r.statusText}`);
          throw 0; 
        }
        console.log(`✓ Fetch successful: ${url}`);
        return r; 
      }catch(e){ 
        console.log(`✗ Fetch error for ${url}:`, e);
        return null; 
      } 
    }
    
    function clean(p){ return p.replace(/\/+/g,'/'); }
    function makeTryList(folder, name){ return [`${folder}${name}.glb`, `${folder}model.glb`, `${folder}character.glb`, `${folder}${name}.gltf`, `${folder}model.gltf`]; }
    
    // Helper function to resolve relative paths correctly
    function resolvePath(path, baseUrl = window.location.href) {
      try {
        return new URL(path, baseUrl).href;
      } catch (e) {
        console.log(`Path resolution failed for: ${path}, using as-is`);
        return path;
      }
    }

    async function loadFromFolderOrURL(folder, explicit){
      console.log(`loadFromFolderOrURL called with folder: "${folder}", explicit: "${explicit}"`);
      if (current){ scene.remove(current); disposeObject(current); current=null; }
      const tried = []; let url = null;
      
      if (explicit){ 
        const u = clean(explicit); 
        const resolvedUrl = resolvePath(u);
        tried.push(resolvedUrl); 
        console.log(`Trying explicit URL: ${u} -> ${resolvedUrl}`);
        if (await tryFetch(resolvedUrl)) {
          url = resolvedUrl;
          console.log(`✓ Found model at explicit URL: ${resolvedUrl}`);
        }
      }
      
      if (!url && folder){
        let f = clean(folder); if (!f.endsWith('/')) f += '/';
        const name = f.split('/').filter(Boolean).pop();
        const rel = makeTryList(f, name);
        const abs = makeTryList('/'+f.replace(/^\//,''), name);
        const allUrls = [...rel, ...abs];
        console.log(`Trying folder-based URLs: ${allUrls.join(', ')}`);
        for (const t of allUrls){ 
          const resolvedUrl = resolvePath(t);
          tried.push(resolvedUrl); 
          console.log(`Trying folder URL: ${t} -> ${resolvedUrl}`);
          if (await tryFetch(resolvedUrl)) { 
            url = resolvedUrl; 
            console.log(`✓ Found model at folder URL: ${resolvedUrl}`);
            break; 
          } 
        }
      }
      
      if (!url){ 
        console.log(`✗ Model not found. Tried: ${tried.join(', ')}`);
        setStatus('Model not found.<br><small>Tried:<br>'+tried.map(x=>`<code>${x}</code>`).join('<br>')+'</small>'); 
        return; 
      }

      setStatus('Loading model…');
      console.log(`Loading GLB model from: ${url}`);
      loader.load(url, (g)=>{
        console.log('GLTFLoader success callback called');
        console.log('GLTF object:', g);
        const node = g.scene || g.scenes?.[0];
        if (!node){ 
          console.log('✗ No scene found in loaded GLTF');
          setStatus('Loaded file, but no scene.'); 
          return; 
        }
        console.log('✓ Scene found, adding to scene');
        current = node;
        current.traverse(o=>{ if(o.isMesh||o.isSkinnedMesh){ o.frustumCulled=false; o.castShadow=false; o.receiveShadow=false; } });
        scene.add(current); fit(current);
        setStatus('Model loaded ✓'); setTimeout(()=>status.remove(), 1500);
        console.log('✓ Model loaded and rendered successfully');
      }, (progress) => {
        if (progress.total > 0) {
          const percent = Math.round(progress.loaded / progress.total * 100);
          console.log(`Loading progress: ${percent}%`);
          setStatus(`Loading model… ${percent}%`);
        }
      }, (err)=>{
        console.error('GLTFLoader error:', err);
        setStatus('Failed to load model.<br><small>'+ (err?.message || err) +'</small>');
      });
    }

    const folder = container.dataset.folder || '';
    const file = container.dataset.model || '';
    console.log(`Container dataset - folder: "${folder}", model: "${file}"`);
    setStatus('Viewer ready. Searching for model…');
    loadFromFolderOrURL(folder, file);

  }catch(e){
    console.error('Viewer error:', e);
    setStatus('Viewer error.<br><small>'+ (e?.message || e) +'</small>');
  }
}