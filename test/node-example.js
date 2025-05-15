import fs from 'fs';
import { parseXML } from '../dist/index.js';

const xml = fs.readFileSync('./test/paradise-lost.xml', 'utf8');
const parsed = parseXML(xml);

const plaintext = parsed.text();
parsed.addStandOff('standoff-1');

const tag = { label: 'Person', id: 'persName' };

const tags = [
  { start: 547, end: 557 },   // first Book
  { start: 658, end: 666},    // Paradise
  { start: 746, end: 753},    // Serpent
  { start: 2940, end: 2947 }, // Heav'ns
  { start: 2952, end: 2957 }, // Earth
  { start: 3698, end: 3705 }  // Illumin
];

tags.forEach(({ start, end }) => {
  console.log(`Creating tag on: '${plaintext.substring(start, end)}'`);
  parsed.addStandOffTag('standoff-1', start, end, tag);
});

fs.writeFileSync('./example-result.tei.xml', parsed.xmlString());
console.log('Done.');

