import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { createStandoffTable } from '../../src/standoff/standoff-table';
import type { StandoffTableRow } from '../../src/types';

describe('StandoffTable', () => {
  const createDocument = () => (new JSDOM('<!DOCTYPE html><body></body>')).window.document;

  it('should correctly add inline elements', () => {
    const doc = createDocument();
    const root = doc.createElement('root');
    const text = doc.createTextNode('Hello, world!');

    const rows: StandoffTableRow[] = [
      { row_type: 'open', position: 0, el: root, depth: 0 },
      { row_type: 'text', position: 0, el: text, text: 'Hello, world!', depth: 0 },
      { row_type: 'close', position: 13, el: root, depth: 0 }
    ];

    const table = createStandoffTable(rows);

    table.addInline(0, 5, 'child', { 'role': 'testing' });

    expect(table.rows.length).toBe(6);

    const newRow = table.rows.find((row) => row.row_type === 'open' && row.el?.tagName === 'child');
    expect(newRow).toBeTruthy();
    expect(newRow?.el?.getAttribute('role')).toBe('testing');
  });

  it('should serialize to text correctly', () => {
    const doc = createDocument();
    const root = doc.createElement('root');
    const text = doc.createTextNode('Hello, world!');

    const rows: StandoffTableRow[] = [
      { row_type: 'open', position: 0, el: root, depth: 0 },
      { row_type: 'text', position: 0, el: text, text: 'Hello, world!', depth: 0 },
      { row_type: 'close', position: 13, el: root, depth: 0 }
    ];

    const table = createStandoffTable(rows);

    table.addInline(0, 5, 'child', { 'role': 'testing' });

    const updatedText = table.text();
    expect(updatedText).toContain('Hello');
  });

  it('should generate correct XPointer expressions', () => {
    const doc = createDocument();
    const root = doc.createElement('root');
    const child = doc.createElement('child')
    const text1 = doc.createTextNode('Hello, ');
    const text2 = doc.createTextNode('world');
    const text3 = doc.createTextNode('!');

    const rows: StandoffTableRow[] = [
      { row_type: 'open', position: 0, el: root, depth: 0 },
      { row_type: 'text', position: 0, el: text1, text: 'Hello, ', depth: 0 },
      { row_type: 'open', position: 7, el: child, depth: 1 },
      { row_type: 'text', position: 7, el: text2, text: 'world', depth: 1 },
      { row_type: 'close', position: 12, el: child, depth: 1 },
      { row_type: 'text', position: 12, el: text3, text: '!', depth: 0 },
      { row_type: 'close', position: 13, el: root, depth: 0 }
    ];

    const table = createStandoffTable(rows);
  
    const pointer = table.getXPointer(10);
    expect(pointer).toBe('/ROOT/CHILD::3');
  });

});
