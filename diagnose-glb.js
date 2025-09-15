// GLB Loading Diagnostic Script
// Run this in the browser console to diagnose GLB loading issues

export default async function diagnoseGLBLoading() {
    console.log('🔍 Starting GLB Loading Diagnosis...');
    console.log('=====================================');
    
    const results = {
        fileAccessibility: false,
        threeJsLoading: false,
        gltfLoaderLoading: false,
        modelLoading: false,
        errors: []
    };
    
    try {
        // Test 1: File Accessibility
        console.log('📁 Test 1: File Accessibility');
        try {
            const response = await fetch('models/adamu/model.glb');
            if (response.ok) {
                results.fileAccessibility = true;
                console.log('✅ Model file is accessible');
                console.log(`   Status: ${response.status} ${response.statusText}`);
                console.log(`   Content-Type: ${response.headers.get('content-type')}`);
                console.log(`   Content-Length: ${response.headers.get('content-length')}`);
            } else {
                console.log(`❌ File not accessible: ${response.status} ${response.statusText}`);
                results.errors.push(`File not accessible: ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ File fetch error: ${error.message}`);
            results.errors.push(`File fetch error: ${error.message}`);
        }
        
        // Test 2: Three.js Loading
        console.log('\n📚 Test 2: Three.js Library Loading');
        try {
            const THREE = await import('./libs/three.module.js');
            results.threeJsLoading = true;
            console.log('✅ Three.js loaded successfully');
            console.log(`   Version: ${THREE.REVISION}`);
        } catch (error) {
            console.log(`❌ Three.js loading failed: ${error.message}`);
            results.errors.push(`Three.js loading failed: ${error.message}`);
        }
        
        // Test 3: GLTFLoader Loading
        console.log('\n🔧 Test 3: GLTFLoader Loading');
        try {
            const { GLTFLoader } = await import('./libs/GLTFLoader.js');
            results.gltfLoaderLoading = true;
            console.log('✅ GLTFLoader loaded successfully');
        } catch (error) {
            console.log(`❌ GLTFLoader loading failed: ${error.message}`);
            results.errors.push(`GLTFLoader loading failed: ${error.message}`);
        }
        
        // Test 4: Model Loading
        console.log('\n🎯 Test 4: Model Loading');
        if (results.threeJsLoading && results.gltfLoaderLoading) {
            try {
                const THREE = await import('./libs/three.module.js');
                const { GLTFLoader } = await import('./libs/GLTFLoader.js');
                
                const loader = new GLTFLoader();
                console.log('GLTFLoader instance created');
                
                const gltf = await new Promise((resolve, reject) => {
                    loader.load(
                        'models/adamu/model.glb',
                        (gltf) => {
                            console.log('✅ GLTFLoader success callback called');
                            console.log(`   Scene: ${gltf.scene ? 'present' : 'missing'}`);
                            console.log(`   Scenes: ${gltf.scenes ? gltf.scenes.length : 0}`);
                            console.log(`   Animations: ${gltf.animations ? gltf.animations.length : 0}`);
                            resolve(gltf);
                        },
                        (progress) => {
                            if (progress.total > 0) {
                                const percent = Math.round(progress.loaded / progress.total * 100);
                                console.log(`   Loading progress: ${percent}%`);
                            }
                        },
                        (error) => {
                            console.log(`❌ GLTFLoader error: ${error.message}`);
                            console.log(`   Error details:`, error);
                            reject(error);
                        }
                    );
                });
                
                if (gltf && gltf.scene) {
                    results.modelLoading = true;
                    console.log('✅ Model loaded successfully');
                } else {
                    console.log('⚠️ Model loaded but no scene found');
                    results.errors.push('Model loaded but no scene found');
                }
                
            } catch (error) {
                console.log(`❌ Model loading failed: ${error.message}`);
                results.errors.push(`Model loading failed: ${error.message}`);
            }
        } else {
            console.log('⏭️ Skipping model loading test due to previous failures');
        }
        
        // Summary
        console.log('\n📊 Diagnosis Summary');
        console.log('====================');
        console.log(`File Accessibility: ${results.fileAccessibility ? '✅' : '❌'}`);
        console.log(`Three.js Loading: ${results.threeJsLoading ? '✅' : '❌'}`);
        console.log(`GLTFLoader Loading: ${results.gltfLoaderLoading ? '✅' : '❌'}`);
        console.log(`Model Loading: ${results.modelLoading ? '✅' : '❌'}`);
        
        if (results.errors.length > 0) {
            console.log('\n🚨 Errors Found:');
            results.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        if (!results.fileAccessibility) {
            console.log('   • Check if the model file exists and is accessible');
            console.log('   • Verify the file path is correct');
            console.log('   • Check server configuration for .glb files');
        }
        if (!results.threeJsLoading) {
            console.log('   • Check if Three.js library files are accessible');
            console.log('   • Verify the library paths in viewer.js');
        }
        if (!results.gltfLoaderLoading) {
            console.log('   • Check if GLTFLoader is properly configured');
            console.log('   • Verify Three.js version compatibility');
        }
        if (!results.modelLoading && results.fileAccessibility && results.gltfLoaderLoading) {
            console.log('   • The GLB file might be corrupted or incompatible');
            console.log('   • Try using a different GLB file');
            console.log('   • Check if the file uses unsupported features (like Draco compression)');
        }
        
        return results;
        
    } catch (error) {
        console.error('💥 Diagnosis failed:', error);
        results.errors.push(`Diagnosis failed: ${error.message}`);
        return results;
    }
}

// Export the function for use in other modules
export { diagnoseGLBLoading };