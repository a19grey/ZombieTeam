/**
 * generateFileBriefs.js
 * 
 * This script scans the /src directory recursively, extracts the top documentation
 * from each .js and .html file, and generates a markdown file with the file structure
 * and brief explanations of each file.
 * 
 * Usage: node generateFileBriefs.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const sourceDir = './src';
const outputFile = './Instruct/filebriefs.md';
const linesToRead = 30; // Increased number of lines to read from the top of each file
const fileExtensions = ['.js', '.html'];

// Function to extract the first block comment from a file
function extractFirstBlockComment(content) {
    // For JS files, look for block comments (/* ... */)
    const blockCommentRegex = /\/\*[\s\S]*?\*\//;
    const blockCommentMatch = content.match(blockCommentRegex);
    
    if (blockCommentMatch) {
        return blockCommentMatch[0].trim();
    }
    
    // For JS files, also try looking for line comments (// ...)
    const lineComments = [];
    const lines = content.split('\n');
    let inCommentBlock = false;
    
    for (let i = 0; i < Math.min(linesToRead, lines.length); i++) {
        const line = lines[i].trim();
        if (line.startsWith('//')) {
            lineComments.push(line.substring(2).trim());
            inCommentBlock = true;
        } else if (inCommentBlock && line === '') {
            // Empty line after comments - continue collecting
            lineComments.push('');
        } else if (inCommentBlock) {
            // End of comment block
            break;
        }
    }
    
    if (lineComments.length > 0) {
        return lineComments.join('\n').trim();
    }
    
    // For HTML files or JS files without comments, return the first few lines
    return lines.slice(0, linesToRead).join('\n').trim();
}

// Function to get a description from the content
function getDescription(content, filePath) {
    const ext = path.extname(filePath);
    const firstBlockComment = extractFirstBlockComment(content);
    
    // Clean up the comment by removing comment markers and extra whitespace
    let description = firstBlockComment
        .replace(/\/\*\*?|\*\/|^\s*\*\s?/gm, '') // Remove comment markers
        .trim();
    
    // If no meaningful description found, provide a fallback
    if (!description || description.length < 5) {
        return `File at ${filePath} (no documentation found)`;
    }
    
    // Format the description - keep multiple lines but clean them up
    const lines = description.split('\n');
    const formattedLines = lines.map(line => line.trim()).filter(line => line.length > 0);
    
    // Join the lines with proper markdown line breaks
    return formattedLines.join('  \n'); // Two spaces for markdown line break
}

// Function to recursively scan directories
function scanDirectory(dir, basePath = '', result = {}) {
    const items = fs.readdirSync(dir);
    
    // Initialize this directory in the result object
    result.files = [];
    result.directories = {};
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const relativePath = path.join(basePath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
            // Recursively scan subdirectories
            result.directories[item] = {};
            scanDirectory(itemPath, relativePath, result.directories[item]);
        } else if (stats.isFile()) {
            const ext = path.extname(item);
            
            // Only process files with specified extensions
            if (fileExtensions.includes(ext)) {
                try {
                    // Read the file content
                    const content = fs.readFileSync(itemPath, 'utf8');
                    const description = getDescription(content, relativePath);
                    
                    result.files.push({
                        name: item,
                        path: relativePath,
                        description: description
                    });
                } catch (error) {
                    console.error(`Error reading file ${itemPath}:`, error.message);
                    result.files.push({
                        name: item,
                        path: relativePath,
                        description: `Error reading file: ${error.message}`
                    });
                }
            }
        }
    }
    
    return result;
}

// Function to generate markdown from the file structure
function generateMarkdown(structure, level = 0) {
    let markdown = '';
    const indent = '  '.repeat(level);
    
    // Add files first
    for (const file of structure.files) {
        markdown += `${indent}- 📄 **${file.name}**:  \n`;
        // Indent the description
        const descriptionLines = file.description.split('\n');
        const indentedDescription = descriptionLines.map(line => `${indent}  ${line}`).join('\n');
        markdown += `${indentedDescription}\n\n`;
    }
    
    // Then add directories
    for (const [dirName, dirContent] of Object.entries(structure.directories)) {
        markdown += `${indent}- 📁 **${dirName}/**\n`;
        markdown += generateMarkdown(dirContent, level + 1);
    }
    
    return markdown;
}

// Main function
function main() {
    console.log(`Scanning directory: ${sourceDir}`);
    const fileStructure = scanDirectory(sourceDir);
    
    // Generate markdown content
    let markdownContent = `# Project File Structure\n\n`;
    markdownContent += `> Generated on ${new Date().toLocaleString()}\n\n`;
    markdownContent += `This document provides a detailed overview of the project's file structure with descriptions extracted from file documentation.\n\n`;
    markdownContent += `## /src Directory\n\n`;
    markdownContent += generateMarkdown(fileStructure);
    
    // Ensure the output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the markdown file
    fs.writeFileSync(outputFile, markdownContent);
    console.log(`File structure map has been written to: ${outputFile}`);
}

// Run the script
main(); 