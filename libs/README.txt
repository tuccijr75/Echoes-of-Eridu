Place the following files in this folder (no CDN):

From the three.js distribution (r159 or compatible):
- three.module.js                (from three/build/)
- OrbitControls.js               (from three/examples/jsm/controls/)
- GLTFLoader.js                  (from three/examples/jsm/loaders/)
- DRACOLoader.js                 (from three/examples/jsm/loaders/)
- KTX2Loader.js                  (from three/examples/jsm/loaders/)
- RoomEnvironment.js             (from three/examples/jsm/environments/)
- meshopt_decoder.module.js      (from meshoptimizer / ESM module)

And subfolders for codecs:
- ./draco/ (decoder .wasm/.js files from three/examples/jsm/libs/draco/)
- ./basis/ (transcoder .wasm/.js files from three/examples/jsm/libs/basis/)

After uploading these files into /libs/, pages like /races/adamu.html will load models without any external CDNs.
