import { describe, it, expect } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import { linearized2xml } from '../../src/conversion';
import type { MarkupToken } from '../../src/types';
import { getChildren, getFirstElementChild } from 'src/utils';

describe('standoff2xml', () => {
  const createDocument = () => new DOMParser().parseFromString('<root />', 'text/xml');

  it('should build a simple XML element', () => {
    const doc = createDocument();
    const rootEl = doc.createElement('root') as unknown as Element;

    const rows: MarkupToken[] = [
      { type: 'open', el: rootEl, position: 0, depth: 0 },
      { type: 'text', el: null, text: 'Hello, world!', position: 0, depth: 0 },
      { type: 'close', el: rootEl, position: 13, depth: 0 }
    ];

    const [result] = linearized2xml(rows);

    expect(result?.tagName).toBe('root');
    expect(result?.textContent).toBe('Hello, world!');
  });

  it('should build nested elements with text', () => {
    const doc = createDocument();
    const root = doc.createElement('root') as unknown as Element;
    const child = doc.createElement('child') as unknown as Element;

    const rows: MarkupToken[] = [
      { type: 'open', el: root, position: 0, depth: 0 },
      { type: 'open', el: child, position: 0, depth: 1 },
      { type: 'text', el: null, text: 'Text', position: 0, depth: 1 },
      { type: 'close', el: child, position: 4, depth: 1 },
      { type: 'close', el: root, position: 4, depth: 0 }
    ];

    const [result] = linearized2xml(rows);

    const firstElementChild = getFirstElementChild(result as unknown as Node);

    expect(result?.tagName).toBe('root');
    expect(firstElementChild?.tagName).toBe('child');
    expect(firstElementChild?.textContent).toBe('Text');
  });

  it('should handle attributes', () => {
    const doc = createDocument();
    const el = doc.createElement('tag') as unknown as Element;
    el.setAttribute('id', 'test');
    el.setAttribute('data-value', '42');

    const rows: MarkupToken[] = [
      { type: 'open', el, position: 0, depth: 0 },
      { type: 'text', el: null, text: 'Content', position: 0, depth: 0 },
      { type: 'close', el, position: 7, depth: 0 }
    ];

    const [result] = linearized2xml(rows);

    expect(result?.getAttribute('id')).toBe('test');
    expect(result?.getAttribute('data-value')).toBe('42');
    expect(result?.textContent).toBe('Content');
  });

  it('should handle empty elements', () => {
    const doc = createDocument();
    const parent = doc.createElement('root') as unknown as Element;
    const el = doc.createElement('empty') as unknown as Element;

    const rows: MarkupToken[] = [
      { type: 'open', el: parent, position: 0, depth: 0 },
      { type: 'empty', el, position: 0, depth: 1 },
      { type: 'close', el: parent, position: 0, depth: 1 }
    ];

    const [result] = linearized2xml(rows);
    
    const children = getChildren(result as unknown as Node);

    expect(result?.tagName).toBe('root');
    expect(children[0]?.tagName).toBe('empty');
    expect(children).toHaveLength(1);
  });

  it('should reconstruct mixed content correctly', () => {
    const doc = createDocument();
    const root = doc.createElement('root') as unknown as Element;

    const hi = doc.createElement('hi') as unknown as Element;
    hi.setAttribute('rend', 'italic');

    const rows: MarkupToken[] = [
      { type: 'open', el: root, position: 0, depth: 0 },
      { type: 'text', el: null, text: 'This is a ', position: 0, depth: 0},
      { type: 'open', el: hi, position: 9, depth: 1 },
      { type: 'text', el: null, text: 'sample', position: 9, depth: 1 },
      { type: 'close', el: hi, position: 15, depth: 1 },
      { type: 'text', el: null, text: ' text.', position: 15, depth: 0 },
      { type: 'close', el: root, position: 21, depth: 0 }
    ];

    const [result] = linearized2xml(rows);

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
