import { describe, it, expect } from 'vitest';
import { parseHTML } from 'linkedom';
import { createLinearizedTable } from '../../src/linearized';
import type { MarkupToken } from '../../src/types';

describe('StandoffTable', () => {
  const createDocument = () => parseHTML('<!DOCTYPE html><body></body>').window.document;

  it('should correctly add inline elements', () => {
    const doc = createDocument();
    const root = doc.createElement('root');

    const rows: MarkupToken[] = [
      { row_type: 'open', position: 0, el: root, depth: 0 },
      { row_type: 'text', position: 0, el: null, text: 'Hello, world!', depth: 0 },
      { row_type: 'close', position: 13, el: root, depth: 0 }
    ];

    const table = createLinearizedTable(rows);

    table.addInline(0, 5, 'child', { 'role': 'testing' });

    expect(table.rows.length).toBe(6);

    const newRow = table.rows.find((row) => row.row_type === 'open' && (row.el as Element)?.tagName === 'CHILD');
    expect(newRow).toBeTruthy();
    expect((newRow?.el as Element)?.getAttribute('role')).toBe('testing');
  });

  it('should serialize to text correctly', () => {
    const doc = createDocument();
    const root = doc.createElement('root');

    const rows: MarkupToken[] = [
      { row_type: 'open', position: 0, el: root, depth: 0 },
      { row_type: 'text', position: 0, el: null, text: 'Hello, world!', depth: 0 },
      { row_type: 'close', position: 13, el: root, depth: 0 }
    ];

    const table = createLinearizedTable(rows);

    table.addInline(0, 5, 'child', { 'role': 'testing' });

    const updatedText = table.text();
    expect(updatedText).toContain('Hello');
  });

  it('should generate correct XPointer expressions', () => {
    const doc = createDocument();
    const root = doc.createElement('root');
    const child = doc.createElement('child')

    const rows: MarkupToken[] = [
      { row_type: 'open', position: 0, el: root, depth: 0 },
      { row_type: 'text', position: 0, el: null, text: 'Hello, ', depth: 0 },
      { row_type: 'open', position: 7, el: child, depth: 1 },
      { row_type: 'text', position: 7, el: null, text: 'world', depth: 1 },
      { row_type: 'close', position: 12, el: child, depth: 1 },
      { row_type: 'text', position: 12, el: null, text: '!', depth: 0 },
      { row_type: 'close', position: 13, el: root, depth: 0 }
    ];

    const table = createLinearizedTable(rows);
  
    const pointer = table.getXPointer(10);
    expect(pointer).toBe('/ROOT/CHILD::3');
  });

});
