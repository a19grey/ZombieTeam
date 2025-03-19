/**
 * Update Three.js Imports Script
 * 
 * This script recursively scans the src directory and updates all Three.js imports
 * from CDN to local npm package imports. It's used when migrating the project to Vite.
 * 
 * Example usage: node updateImports.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pattern to find
const cdnImportPattern = /import\s+\*\s+as\s+THREE\s+from\s+['"]https:\/\/cdn\.jsdelivr\.net\/npm\/three@.*?['"]/;
// Replacement pattern
const npmImportPattern = `import * as THREE from 'three'`;

// Function to recursively process files in a directory
function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      // Recursively process subdirectories
      processDirectory(filePath);
    } else if (stats.isFile() && filePath.endsWith('.js')) {
      // Process JavaScript files
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if the file contains a CDN import
        if (cdnImportPattern.test(content)) {
          // Replace CDN import with npm import
          const updatedContent = content.replace(cdnImportPattern, npmImportPattern);
          
          // Write back to the file
          fs.writeFileSync(filePath, updatedContent, 'utf8');
          console.log(`Updated: ${filePath}`);
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
  });
}

// Start processing from the src directory
console.log('Starting to update Three.js imports...');
processDirectory(path.join(__dirname, 'src'));
console.log('Import updates complete!'); 