import { describe, it, expect } from 'vitest';
import { parseHTML } from 'linkedom';
import { createLinearizedTable } from '../../src/linearized';
import type { MarkupToken } from '../../src/types';
import { parseXML } from 'src';

describe('StandoffTable', () => {
  const createDocument = () => parseHTML('<!DOCTYPE html><body></body>').window.document;

  it('should correctly add inline elements', () => {
    const doc = createDocument();
    const root = doc.createElement('root');

    const rows: MarkupToken[] = [
      { type: 'open', position: 0, el: root, depth: 0 },
      { type: 'text', position: 0, el: null, text: 'Hello, world!', depth: 0 },
      { type: 'close', position: 13, el: root, depth: 0 }
    ];

    const table = createLinearizedTable(root, rows);

    table.addInline(0, 5, 'child', { 'role': 'testing' });

    expect(table.tokens.length).toBe(6);

    const newRow = table.tokens.find(token => token.type === 'open' && (token.el as Element)?.tagName === 'CHILD');
    expect(newRow).toBeTruthy();
    expect((newRow?.el as Element)?.getAttribute('role')).toBe('testing');
  });

  it('should serialize to text correctly', () => {
    const doc = createDocument();
    const root = doc.createElement('root');

    const rows: MarkupToken[] = [
      { type: 'open', position: 0, el: root, depth: 0 },
      { type: 'text', position: 0, el: null, text: 'Hello, world!', depth: 0 },
      { type: 'close', position: 13, el: root, depth: 0 }
    ];

    const table = createLinearizedTable(doc.documentElement, rows);

    table.addInline(0, 5, 'child', { 'role': 'testing' });

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
            <p />
            <p>This is a <hi rend="italic">sample</hi> paragraph with <term>markup</term>.</p>
          </body>
        </text>
      </TEI>
    `;

    const doc = parseHTML(xml).window.document;

    const parsed = parseXML(doc.documentElement);
    
    const text = parsed.text().substring(151, 155);
    expect(text).toBe('is a');

    const pointer = parsed.getXPointer(151);
    expect(pointer).toBe('/TEI[1]/TEXT[1]/BODY[1]/P[2]::5');
  });

});
