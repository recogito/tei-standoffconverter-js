import fs from 'fs';
import { parseXML } from '../dist/index.js';

const xml = fs.readFileSync('./test/paradise-lost.xml', 'utf8');
const parsed = parseXML(xml);

const plaintext = parsed.text();
parsed.addStandOff('standoff-1');

const tag = { label: 'Person', id: 'persName' };

const tags = [
  { start: 416, end: 426 },   // first Book
  { start: 527, end: 535},    // Paradise
  { start: 615, end: 622},    // Serpent
  { start: 2809, end: 2816 }, // Heav'ns
  { start: 2821, end: 2826 }, // Earth
  { start: 3567, end: 3574 }  // Illumin
];

tags.forEach(({ start, end }) => {
  console.log(`Creating tag on: '${plaintext.substring(start, end)}'`);
  parsed.addStandOffTag('standoff-1', start, end, tag);
});

fs.writeFileSync('./example-result.tei.xml', parsed.xmlString());
console.log('Done.');

