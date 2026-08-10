// Regenerates src/lib/drafting/humanizer-prompt.ts from src/prompts/humanizer.skill.md.
// Run after updating the skill markdown:  node scripts/gen-humanizer-prompt.cjs
// Skill source: https://github.com/blader/humanizer (MIT).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const md = fs.readFileSync(path.join(root, 'src', 'prompts', 'humanizer.skill.md'), 'utf8');
const out = [
  '// AUTO-GENERATED from src/prompts/humanizer.skill.md — do not edit by hand.',
  '// Regenerate via: node scripts/gen-humanizer-prompt.cjs. Source: blader/humanizer (MIT).',
  'export const HUMANIZER_SKILL = ' + JSON.stringify(md) + ';',
  '',
].join('\n');
const dest = path.join(root, 'src', 'lib', 'drafting', 'humanizer-prompt.ts');
fs.writeFileSync(dest, out, 'utf8');
console.log('WROTE ' + dest + ' (' + out.length + ' bytes)');
