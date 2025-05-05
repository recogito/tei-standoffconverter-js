import { describe, it, expect } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import { parseXML } from '../../src';
import { createLinearizedTable } from '../../src/linearized';
import type { MarkupToken } from '../../src/types';

describe('StandoffTable', () => {
  const createDocument = () => {
    const parser = new DOMParser();
    return parser.parseFromString('<!DOCTYPE html><body></body>', 'text/xml');
  } 

  it('should correctly add inline elements', () => {
    const doc = createDocument();
    const root = doc.createElement('root') as unknown as Element;

    const rows: MarkupToken[] = [
      { type: 'open', position: 0, el: root, depth: 0 },
      { type: 'text', position: 0, el: null, text: 'Hello, world!', depth: 0 },
      { type: 'close', position: 13, el: root, depth: 0 }
    ];

    const table = createLinearizedTable(root, rows);

    table.addInline(0, 5, 'childNode', { 'role': 'testing' });

    expect(table.tokens.length).toBe(6);

    const newRow = table.tokens.find(token => token.type === 'open' && (token.el as Element)?.tagName === 'childNode');
    expect(newRow).toBeTruthy();
    expect((newRow?.el as Element)?.getAttribute('role')).toBe('testing');
  });

  it('should serialize to text correctly', () => {
    const doc = createDocument();
    const root = doc.createElement('root') as unknown as Element;

    const rows: MarkupToken[] = [
      { type: 'open', position: 0, el: root, depth: 0 },
      { type: 'text', position: 0, el: null, text: 'Hello, world!', depth: 0 },
      { type: 'close', position: 13, el: root, depth: 0 }
    ];

    const table = createLinearizedTable(doc.documentElement as unknown as Element, rows);

    table.addInline(0, 5, 'childNode', { 'role': 'testing' });

    const serialized = table.xmlString();
    expect(serialized.includes('childNode')).toBeTruthy();

    const updatedText = table.text();
    expect(updatedText).toContain('Hello');
  });

  it('should generate correct XPointer expressions', () => {
    const xml = `
      <TEI xmlns="http://www.tei-c.org/ns/1.0">
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>Sample TEI Document</title>
            </titleStmt>
          </fileDesc>
        </teiHeader>
        <text>
          <body>
            <div></div>
            <div>Hello World</div>
            <div>
              <p>This is a <hi rend="italic">sample</hi> paragraph with <term>markup</term>.</p>
            </div>
            <div></div>
          </body>
        </text>
      </TEI>
    `;

    const parsed = parseXML(xml);
    
    const text = parsed.text().substring(190, 194);
    expect(text).toBe('is a');

    const pointer = parsed.getXPointer(190);
    expect(pointer).toBe('/TEI[1]/text[1]/body[1]/div[3]/p[1]::5');
  });

  it('should generate correct character offsets', () => {
    const xml = `
      <TEI>
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>Sample TEI Document</title>
            </titleStmt>
          </fileDesc>
        </teiHeader>
        <text>
          <body>
            <p />
            <p>This is a <hi rend="italic">sample</hi> paragraph with <term>markup</term>.</p>
          </body>
        </text>
      </TEI>
    `;

    const parsed = parseXML(xml);

    const text = parsed.text().substring(151, 155);
    expect(text).toBe('is a');

    const offset = parsed.getCharacterOffset('/TEI[1]/text[1]/body[1]/p[2]::5');
    expect(offset).toBe(151);
  });

});
