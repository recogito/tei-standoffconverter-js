import type { StandoffTableRow } from '../types';

export const standoff2xml = (rows: StandoffTableRow[]) => {
  const oldEls2newEls = new Map<Element, Element>();
  
  let rootEl: Element | null = null;
  
  // First pass: create all elements
  for (const row of rows) {
    if ((row.row_type === 'open' || row.row_type === 'close' || row.row_type === 'empty') && row.el) {      
      if (!oldEls2newEls.get(row.el)) {
        const tagName = row.el.tagName.toLowerCase();
        const newEl = document.createElementNS(row.el.namespaceURI || 'http://www.tei-c.org/ns/1.0', tagName);
        
        // Copy attributes
        for (let i = 0; i < row.el.attributes.length; i++) {
          const attr = row.el.attributes[i];
          newEl.setAttribute(attr.name, attr.value);
        }
        
        oldEls2newEls.set(row.el, newEl);
        
        // Track new root element
        if (rootEl === null && row.depth === 0)
          rootEl = newEl;
      }
    }
  }

  if (!rootEl) throw new Error('No root element');
  
  // Second pass: build the tree
  let stack: Element[] = [];
  let currentParent: Element | null = null;
  let lastPosition = -1;
  let textBuffer = '';
  
  for (const row of rows) {
    if (row.position > lastPosition && textBuffer && currentParent) {
      currentParent.appendChild(document.createTextNode(textBuffer));
      textBuffer = '';
    }
    
    lastPosition = row.position;
    
    if (row.row_type === 'open' && row.el) {
      const newEl = oldEls2newEls.get(row.el);
      
      if (currentParent) currentParent.appendChild(newEl);

      stack.push(currentParent);
      currentParent = newEl;
    } else if (row.row_type === 'close' && row.el) {
      currentParent = stack.pop() || null;
    } else if (row.row_type === 'empty' && row.el) {
      const newEl = oldEls2newEls.get(row.el);

      if (currentParent) currentParent.appendChild(newEl);
    } else if (row.row_type === 'text' && row.text) {
      textBuffer += row.text;
    }
  }
  
  // Add remaining text
  if (textBuffer && currentParent)
    currentParent.appendChild(document.createTextNode(textBuffer));
  
  return rootEl;
}