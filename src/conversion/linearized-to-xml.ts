import { doc } from '../dom';
import type { MarkupToken } from '../types';

export const linearized2xml = (rows: MarkupToken[], namespace = 'http://www.tei-c.org/ns/1.0') => {
  const oldEls2newEls = new Map<Element, Element>();
  
  let rootEl: Element | null = null;
  
  // First pass: create all elements
  for (const row of rows) {
    if ((row.type === 'open' || row.type === 'close' || row.type === 'empty') && row.el) {      
      if (!oldEls2newEls.get(row.el)) {
        const tagName = (row.el as any).dataset?.origname ? 'tei-' + (row.el as any).dataset.origname.toLowerCase() : row.el.tagName;
        const newEl = doc.createElementNS(row.el.namespaceURI || namespace, tagName);
        
        // Copy attributes
        for (let i = 0; i < row.el.attributes.length; i++) {
          const attr = row.el.attributes[i];
          newEl.setAttribute(attr.name, attr.value);
        }
        
        oldEls2newEls.set(row.el, newEl);
        
        // Track new root element
        if (rootEl === null)
          rootEl = newEl;
      }
    }
  }
  
  // Second pass: build the tree
  let stack: Element[] = [];
  let currentParent: Element | null = null;
  let lastPosition = -1;
  let textBuffer = '';
  
  for (const row of rows) {
    if (row.position > lastPosition && textBuffer && currentParent) {
      currentParent.appendChild(doc.createTextNode(textBuffer));
      textBuffer = '';
    }
    
    lastPosition = row.position;
    
    if (row.type === 'open' && row.el) {
      const newEl = oldEls2newEls.get(row.el);
      
      if (currentParent) currentParent.appendChild(newEl);

      stack.push(currentParent);
      currentParent = newEl;
    } else if (row.type === 'close' && row.el) {
      currentParent = stack.pop() || null;
    } else if (row.type === 'empty' && row.el) {
      const newEl = oldEls2newEls.get(row.el);

      if (currentParent) currentParent.appendChild(newEl);
    } else if (row.type === 'text' && row.text) {
      textBuffer += row.text;
    }
  }
  
  // Add remaining text
  if (textBuffer && currentParent)
    currentParent.appendChild(doc.createTextNode(textBuffer));
  
  return [rootEl, oldEls2newEls] as const;
}