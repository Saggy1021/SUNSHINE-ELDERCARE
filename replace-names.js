const fs = require('fs');
const path = require('path');

const DIRS_TO_CHECK = ['app', 'components', 'lib', 'PROJECT_IMPLEMENTATION.md'];

function processDirectory(dir) {
  if (fs.statSync(dir).isFile()) {
    processFile(dir);
    return;
  }
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  if (!filePath.match(/\.(tsx|ts|md|json|css)$/)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content
    .replace(/Sunshine Eldercare/g, 'Sunshine Eldercare')
    .replace(/Sunshine Eldercare/g, 'Sunshine Eldercare')
    .replace(/Sunshine Eldercare/g, 'SUNSHINE ELDERCARE')
    .replace(/Sunshine Eldercare/g, 'SUNSHINE ELDERCARE')
    .replace(/Sunshine Eldercare/g, 'Sunshine');
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

DIRS_TO_CHECK.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    processDirectory(fullPath);
  }
});
