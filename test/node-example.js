import fs from 'fs';
import { parseXML } from '../dist/index.js';

const xml = fs.readFileSync('./test/paradise-lost.xml', 'utf8');
const parsed = parseXML(xml);

const start = 568;
const end = 573;

const plaintext = parsed.text();
console.log(`Creating tag on: '${plaintext.substring(start, end)}'`);

parsed.addStandOff('standoff-2');
parsed.addStandOffTag('standoff-2', start, end, { label: 'Person', id: 'persName' });

fs.writeFileSync('./example-result.tei.xml', parsed.xmlString());
console.log('Done.');

