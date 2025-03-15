/**
 * Debug Utility for WebGL and Three.js
 * 
 * This script provides debugging tools for WebGL and Three.js rendering issues.
 * It can be included in the main HTML file to help diagnose rendering problems.
 * 
 * Example usage:
 * import { debugWebGL, fixWebGLContext, monitorRenderingPerformance } from './debug.js';
 */

/**
 * Checks WebGL availability and capabilities
 * @returns {Object} WebGL information and status
 */
export const debugWebGL = () => {
    console.log('Running WebGL diagnostics...');
    
    const result = {
        webglAvailable: false,
        webgl2Available: false,
        renderer: null,
        extensions: [],
        maxTextureSize: 0,
        error: null
    };
    
    try {
        // Check WebGL 1 availability
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (gl) {
            result.webglAvailable = true;
            result.renderer = gl.getParameter(gl.RENDERER);
            result.vendor = gl.getParameter(gl.VENDOR);
            result.version = gl.getParameter(gl.VERSION);
            result.shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
            result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            
            // Get extensions
            const extensions = gl.getSupportedExtensions();
            result.extensions = extensions;
            
            // Check WebGL 2 availability
            const gl2 = canvas.getContext('webgl2');
            result.webgl2Available = !!gl2;
        }
    } catch (error) {
        result.error = error.message;
        console.error('WebGL diagnostic error:', error);
    }
    
    console.log('WebGL diagnostics result:', result);
    return result;
};

/**
 * Attempts to fix common WebGL context issues
 * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
 * @returns {boolean} Whether any fixes were applied
 */
export const fixWebGLContext = (renderer) => {
    console.log('Attempting to fix WebGL context...');
    let fixesApplied = false;
    
    try {
        // Check if renderer exists
        if (!renderer) {
            console.error('No renderer provided to fix');
            return false;
        }
        
        // Try to reset the context
        const gl = renderer.getContext();
        
        if (gl) {
            // Force context reset
            gl.getExtension('WEBGL_lose_context')?.restoreContext();
            fixesApplied = true;
            
            // Set conservative rendering parameters
            renderer.setPixelRatio(1); // Use default pixel ratio
            renderer.shadowMap.enabled = false; // Disable shadows temporarily
            
            console.log('Applied WebGL context fixes');
        }
    } catch (error) {
        console.error('Error fixing WebGL context:', error);
    }
    
    return fixesApplied;
};

/**
 * Monitors rendering performance and detects issues
 * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Camera} camera - The Three.js camera
 * @returns {Function} Function to stop monitoring
 */
export const monitorRenderingPerformance = (renderer, scene, camera) => {
    console.log('Starting rendering performance monitoring...');
    
    let frameCount = 0;
    let lastTime = performance.now();
    let running = true;
    
    const checkPerformance = () => {
        if (!running) return;
        
        frameCount++;
        const now = performance.now();
        const elapsed = now - lastTime;
        
        // Check every second
        if (elapsed >= 1000) {
            const fps = frameCount / (elapsed / 1000);
            console.log(`Rendering at ${fps.toFixed(1)} FPS`);
            
            // Check for very low FPS which might indicate rendering issues
            if (fps < 10) {
                console.warn('Very low FPS detected - possible rendering issues');
                
                // Try to render a simple test scene to check if rendering works at all
                const testScene = new THREE.Scene();
                testScene.background = new THREE.Color(0xff0000); // Bright red for visibility
                const testCube = new THREE.Mesh(
                    new THREE.BoxGeometry(1, 1, 1),
                    new THREE.MeshBasicMaterial({ color: 0xffffff })
                );
                testScene.add(testCube);
                
                // Try rendering the test scene
                renderer.render(testScene, camera);
                console.log('Test render completed - check for red background');
            }
            
            frameCount = 0;
            lastTime = now;
        }
        
        requestAnimationFrame(checkPerformance);
    };
    
    checkPerformance();
    
    // Return function to stop monitoring
    return () => {
        running = false;
        console.log('Stopped rendering performance monitoring');
    };
};

/**
 * Creates a fallback canvas with diagnostic information
 * This can be used when WebGL rendering fails completely
 */
export const createFallbackCanvas = () => {
    console.log('Creating fallback canvas with diagnostic information');
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';
    
    // Add to document body
    document.body.appendChild(canvas);
    
    // Get 2D context
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw diagnostic information
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText('WebGL Rendering Diagnostic', 20, 40);
    ctx.font = '16px Arial';
    
    // Get browser and system information
    const browserInfo = `Browser: ${navigator.userAgent}`;
    const screenInfo = `Screen: ${window.screen.width}x${window.screen.height}, ${window.devicePixelRatio}x pixel ratio`;
    
    ctx.fillText(browserInfo, 20, 80);
    ctx.fillText(screenInfo, 20, 110);
    
    // Run WebGL diagnostics
    const webglInfo = debugWebGL();
    
    ctx.fillText(`WebGL Available: ${webglInfo.webglAvailable}`, 20, 140);
    ctx.fillText(`WebGL2 Available: ${webglInfo.webgl2Available}`, 20, 170);
    
    if (webglInfo.renderer) {
        ctx.fillText(`Renderer: ${webglInfo.renderer}`, 20, 200);
        ctx.fillText(`Vendor: ${webglInfo.vendor}`, 20, 230);
        ctx.fillText(`Version: ${webglInfo.version}`, 20, 260);
    }
    
    if (webglInfo.error) {
        ctx.fillStyle = '#ff5555';
        ctx.fillText(`Error: ${webglInfo.error}`, 20, 290);
    }
    
    // Add instructions
    ctx.fillStyle = '#aaffaa';
    ctx.fillText('Troubleshooting steps:', 20, 330);
    ctx.fillText('1. Try refreshing the page', 30, 360);
    ctx.fillText('2. Check browser console for errors (F12)', 30, 390);
    ctx.fillText('3. Try a different browser', 30, 420);
    ctx.fillText('4. Update graphics drivers', 30, 450);
    
    return canvas;
}; 