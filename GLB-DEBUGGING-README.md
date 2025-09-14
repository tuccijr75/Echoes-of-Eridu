# GLB Loading Debugging Guide

This guide helps you diagnose and fix GLB loading issues in your Echoes of Eridu project.

## Quick Start

1. **Open the diagnostic tool**: Navigate to `diagnose.html` in your browser
2. **Run the diagnosis**: Click "Run Diagnosis" button
3. **Check the console**: Open browser DevTools (F12) and check the Console tab
4. **Review results**: The diagnostic tool will show you exactly what's failing

## Files Created for Debugging

### Diagnostic Tools
- `diagnose.html` - Main diagnostic interface
- `diagnose-glb.js` - Core diagnostic script
- `glb-test.html` - Comprehensive test suite
- `simple-glb-test.html` - Simple test with visual feedback

### Enhanced Viewer
- `viewer.js` - Original viewer with enhanced debugging
- `viewer-fixed.js` - Fixed viewer with path resolution improvements
- `races/adamu-fixed.html` - Test page using absolute paths

### Test Files (can be deleted after debugging)
- `test.html` - Basic GLB loading test
- `debug.html` - Debug version with detailed logging
- `minimal-test.html` - Minimal Three.js setup
- `comprehensive-test.html` - Comprehensive test with detailed error reporting
- `debug-viewer.html` - Debug version of your original viewer
- `simple-test.html` - Simple test with better error handling
- `fetch-test.html` - Tests fetch functionality

## How to Use

### Step 1: Run the Diagnostic Tool
1. Open `diagnose.html` in your browser
2. Click "Run Diagnosis"
3. Check both the web page results and browser console

### Step 2: Check Specific Issues
Based on the diagnostic results:

**If file accessibility fails:**
- Check if `models/adamu/model.glb` exists
- Verify server is running and serving files correctly
- Check file permissions

**If Three.js loading fails:**
- Check if `libs/three.module.js` is accessible
- Verify CDN connectivity
- Check browser console for CORS errors

**If GLTFLoader fails:**
- Check if `libs/GLTFLoader.js` is accessible
- Verify Three.js version compatibility
- Check for JavaScript errors

**If model loading fails:**
- The GLB file might be corrupted
- Try with a different GLB file
- Check if file uses unsupported features

### Step 3: Test the Fixed Viewer
1. Open `races/adamu-fixed.html`
2. Check if the model loads with absolute paths
3. If it works, the issue was path resolution

### Step 4: Apply the Fix
If the fixed viewer works, you can:
1. Replace `viewer.js` with `viewer-fixed.js`
2. Update your HTML files to use absolute paths
3. Or modify the path resolution logic

## Common Issues and Solutions

### Issue: "Model not found"
**Solution**: Check path resolution
- Use absolute paths: `/models/adamu/model.glb` instead of `../models/adamu/model.glb`
- Verify the file exists and is accessible

### Issue: "Failed to load model" (GLTFLoader error)
**Solution**: Check GLB file integrity
- Validate the GLB file with online tools
- Try with a different GLB file
- Check if file uses Draco compression

### Issue: Library loading failures
**Solution**: Check network connectivity
- Verify CDN access
- Check for CORS issues
- Ensure local library files exist

### Issue: Three.js version compatibility
**Solution**: Try different versions
- Current version: Three.js r159
- Try r158 or r157 if issues persist
- Check Three.js release notes for breaking changes

## Debugging Tips

1. **Always check the browser console** - Most errors will appear there
2. **Use the diagnostic tool first** - It will identify the exact issue
3. **Test with simple GLB files** - Use basic models to isolate issues
4. **Check network tab** - Verify HTTP requests are successful
5. **Test in different browsers** - Some issues are browser-specific

## File Structure
```
/workspace/
├── diagnose.html              # Main diagnostic tool
├── diagnose-glb.js           # Diagnostic script
├── glb-test.html             # Comprehensive test
├── simple-glb-test.html      # Simple test
├── viewer.js                 # Enhanced original viewer
├── viewer-fixed.js           # Fixed viewer
├── races/
│   └── adamu-fixed.html      # Test page with absolute paths
└── models/
    └── adamu/
        ├── model.glb         # Your GLB file
        └── adamu.glb         # Duplicate GLB file
```

## Next Steps

After running the diagnostics:
1. Identify the specific issue from the results
2. Apply the appropriate fix
3. Test with the fixed viewer
4. Update your production files
5. Clean up test files when done

## Support

If you're still having issues after running the diagnostics:
1. Check the browser console for specific error messages
2. Verify your server configuration
3. Test with a different GLB file
4. Consider updating or downgrading Three.js version