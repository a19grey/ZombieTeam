/**
 * Model Processor Utility - Preprocesses 3D models for efficient reuse
 * 
 * This utility provides functionality to load 3D models, apply modifications
 * (such as material adjustments), and export them to be cached and reused.
 * This prevents having to repeatedly apply the same modifications to models
 * loaded multiple times during gameplay.
 * 
 * Example usage:
 *   import { preprocessModel } from './utils/modelProcessor.js';
 *   
 *   // Process a model once, saving the result for later reuse
 *   preprocessModel('./exploder.glb', 'exploder_processed.glb', (model) => {
 *     // Apply brightness modifications
 *     model.traverse((node) => {
 *       if (node.isMesh) {
 *         // Modify materials here
 *       }
 *     });
 *   });
 *   
 *   // Then in your game code, load the processed model instead
 *   loader.load('./exploder_processed.glb', ...);
 */

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { logger } from './logger.js';

// Add modelprocessor to logger sections
logger.addSection('modelprocessor');

// Cache for already processed models
const processedModels = new Map();

/**
 * Preprocesses a model by loading it, applying modifications, and exporting it
 * 
 * @param {string} inputPath - Path to the original model file
 * @param {string} outputPath - Path where the processed model should be saved
 * @param {Function} modifierCallback - Function that applies modifications to the loaded model
 * @returns {Promise} Promise that resolves when processing is complete
 */
export const preprocessModel = (inputPath, outputPath, modifierCallback) => {
    return new Promise((resolve, reject) => {
        // Check if we've already processed this model
        if (processedModels.has(inputPath)) {
            logger.info('modelprocessor', `Model ${inputPath} already processed, skipping`);
            resolve(processedModels.get(inputPath));
            return;
        }

        logger.info('modelprocessor', `Processing model: ${inputPath}`);
        
        const loader = new GLTFLoader();
        
        // Load the model
        loader.load(
            inputPath,
            (gltf) => {
                const model = gltf.scene;
                
                // Apply the modifications provided by the callback
                if (modifierCallback && typeof modifierCallback === 'function') {
                    modifierCallback(model);
                }
                
                // Export the modified model
                const exporter = new GLTFExporter();
                exporter.parse(
                    model,
                    (result) => {
                        if (result instanceof ArrayBuffer) {
                            // For web use, you would save this buffer to a file or IndexedDB
                            // In this implementation, we'll just cache the model in memory
                            processedModels.set(inputPath, model.clone());
                            
                            // In a complete implementation, you would write the buffer to disk
                            // This would typically be done in a build process or server-side
                            // saveBufferToDisk(result, outputPath);
                            
                            logger.info('modelprocessor', `Model processed: ${inputPath} → ${outputPath}`);
                            resolve(model);
                        } else {
                            logger.error('modelprocessor', 'Failed to export model as binary');
                            reject(new Error('Failed to export model as binary'));
                        }
                    },
                    (error) => {
                        logger.error('modelprocessor', 'Error exporting model', { error: error.message });
                        reject(error);
                    },
                    { binary: true } // Export as GLB (binary GLTF)
                );
            },
            (xhr) => {
                logger.debug('modelprocessor', `Model loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
            },
            (error) => {
                logger.error('modelprocessor', 'Error loading model', { error: error.message });
                reject(error);
            }
        );
    });
};

/**
 * Retrieves a processed model from the cache
 * 
 * @param {string} modelPath - Original path of the model
 * @returns {THREE.Object3D|null} The processed model or null if not found
 */
export const getProcessedModel = (modelPath) => {
    if (processedModels.has(modelPath)) {
        // Return a clone of the cached model
        return processedModels.get(modelPath).clone();
    }
    return null;
};

/**
 * Applies common brightness adjustments to a model
 * This encapsulates the brightness adjustment logic seen in exploder.js
 * 
 * @param {THREE.Object3D} model - The model to adjust
 * @returns {THREE.Object3D} The adjusted model
 */
export const applyBrightnessAdjustment = (model) => {
    model.traverse((node) => {
        if (node.isMesh && node.material) {
            // Handle both single material and material array
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            
            materials.forEach((material) => {
                // Add emissive properties to brighten the model
                material.emissive = material.color.clone().multiplyScalar(0.3);
                material.emissiveIntensity = 0.0;
                
                // Increase base color brightness
                material.color.multiplyScalar(1.7);
                
                // Reduce metalness and increase roughness for better visibility
                if (material.metalness !== undefined) {
                    material.metalness = Math.max(0, material.metalness - 0.3);
                }
                
                if (material.roughness !== undefined) {
                    material.roughness = Math.min(1, material.roughness + 0.2);
                }
                
                // Ensure materials receive shadows properly
                material.needsUpdate = true;
            });
            
            // Make sure model casts and receives shadows
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });
    
    return model;
};

// Note: A production implementation would include code to write to disk
// This functionality would typically be part of a build process
// or require a server-side component 