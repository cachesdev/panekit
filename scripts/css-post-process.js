import { readFileSync, writeFileSync } from 'fs';

const cssPath = './dist/index.css';
let css = readFileSync(cssPath, 'utf-8');

css = css.replace(/@layer\s+theme,base,components;\n?/g, '');

writeFileSync(cssPath, css);
console.log('✓ Removed layer declaration from CSS');
