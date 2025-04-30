import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { standoff2xml } from '../../src/conversion/standoff-to-xml';
import type { StandoffTableRow } from '../../src/types';

describe('standoff2xml', () => {
  const createDocument = () => (new JSDOM('<!DOCTYPE html><body></body>')).window.document;

  it('should build a simple XML element', () => {
    const doc = createDocument();
    const rootEl = doc.createElement('root');
    const textEl = doc.createTextNode('Hello, World!');

    const rows: StandoffTableRow[] = [
      { row_type: 'open', el: rootEl, position: 0, depth: 0 },
      { row_type: 'text', el: textEl, text: 'Hello, world!', position: 0, depth: 0 },
      { row_type: 'close', el: rootEl, position: 13, depth: 0 }
    ];

    const [result] = standoff2xml(rows);

    expect(result?.tagName).toBe('root');
    expect(result?.textContent).toBe('Hello, world!');
  });

  it('should build nested elements with text', () => {
    const doc = createDocument();
    const root = doc.createElement('root');
    const child = doc.createElement('child');
    const text = doc.createTextNode('Text');

    const rows: StandoffTableRow[] = [
      { row_type: 'open', el: root, position: 0, depth: 0 },
      { row_type: 'open', el: child, position: 0, depth: 1 },
      { row_type: 'text', el: text, text: 'Text', position: 0, depth: 1 },
      { row_type: 'close', el: child, position: 4, depth: 1 },
      { row_type: 'close', el: root, position: 4, depth: 0 }
    ];

    const [result] = standoff2xml(rows);

    expect(result?.tagName).toBe('root');
    expect(result?.firstElementChild?.tagName).toBe('child');
    expect(result?.firstElementChild?.textContent).toBe('Text');
  });

  it('should handle attributes', () => {
    const doc = createDocument();
    const el = doc.createElement('tag');
    el.setAttribute('id', 'test');
    el.setAttribute('data-value', '42');
    const text = doc.createTextNode('Content');

    const rows: StandoffTableRow[] = [
      { row_type: 'open', el, position: 0, depth: 0 },
      { row_type: 'text', el: text, text: 'Content', position: 0, depth: 0 },
      { row_type: 'close', el, position: 7, depth: 0 }
    ];

    const [result] = standoff2xml(rows);

    expect(result?.getAttribute('id')).toBe('test');
    expect(result?.getAttribute('data-value')).toBe('42');
    expect(result?.textContent).toBe('Content');
  });

  it('should handle empty elements', () => {
    const doc = createDocument();
    const parent = doc.createElement('root');
    const el = doc.createElement('empty');

    const rows: StandoffTableRow[] = [
      { row_type: 'open', el: parent, position: 0, depth: 0 },
      { row_type: 'empty', el, position: 0, depth: 1 },
      { row_type: 'close', el: parent, position: 0, depth: 1 }
    ];

    const [result] = standoff2xml(rows);

    expect(result?.tagName).toBe('root');
    expect(result?.children[0]?.tagName).toBe('empty');
    expect(result?.children).toHaveLength(1);
  });

  it('should reconstruct mixed content correctly', () => {
    const doc = createDocument();
    const root = doc.createElement('root');

    const hi = doc.createElement('hi');
    hi.setAttribute('rend', 'italic');

    const text1 = doc.createTextNode('This is a ');
    const text2 = doc.createTextNode('sample');
    const text3 = doc.createTextNode('text.');

    const rows: StandoffTableRow[] = [
      { row_type: 'open', el: root, position: 0, depth: 0 },
      { row_type: 'text', el: text1, text: 'This is a ', position: 0, depth: 0},
      { row_type: 'open', el: hi, position: 9, depth: 1 },
      { row_type: 'text', el: text2, text: 'sample', position: 9, depth: 1 },
      { row_type: 'close', el: hi, position: 15, depth: 1 },
      { row_type: 'text', el: text3, text: ' text.', position: 15, depth: 0 },
      { row_type: 'close', el: root, position: 21, depth: 0 }
    ];

    const [result] = standoff2xml(rows);

    expect(result?.tagName).toBe('root');
    expect(result?.childNodes.length).toBe(3);
    expect(result?.childNodes[0].nodeType).toBe(3);
    expect(result?.childNodes[0].textContent).toBe('This is a ');
    expect((result?.childNodes[1] as Element).tagName).toBe('hi');
    expect((result?.childNodes[1] as Element).getAttribute('rend')).toBe('italic');
    expect((result?.childNodes[1] as Element).textContent).toBe('sample');
    expect(result?.childNodes[2].textContent).toBe(' text.');
  });

});
