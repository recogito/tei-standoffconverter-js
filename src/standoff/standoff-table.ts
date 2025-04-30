import { doc } from '../dom';
import { standoff2xml } from '../conversion';
import type { StandoffTableRow } from '../types';
import { createModifyOperations, createQueryOperations } from './operations';

export const createStandoffTable = (rows: StandoffTableRow[], namespace = 'http://www.tei-c.org/ns/1.0') => {

  const query = createQueryOperations(rows);

  const modify = createModifyOperations(rows);

  const _createElement = (tag: string, attrib?: Record<string, string>): Element => {
    const el = doc.createElementNS(namespace, tag);
    
    if (attrib) {
      Object.entries(attrib).forEach(([key, value]) => {
        if (key === 'xml:id')
          el.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'id', value);
        else
          el.setAttribute(key, value);
      });
    }
    
    return el;
  }

  const _replaceElement = (oldEl: Element, newEl: Element) => {
    const secondParent = oldEl.parentNode;
    if (secondParent === null) return; // Should never happen

    // Copy tail text if needed
    if (oldEl.nextSibling && oldEl.nextSibling.nodeType === Node.TEXT_NODE) {
      if (oldEl.nextSibling.textContent) {
        const nextSibling = doc.createTextNode(oldEl.nextSibling.textContent);

        if (oldEl.nextSibling.nextSibling)
          secondParent.insertBefore(nextSibling, oldEl.nextSibling.nextSibling);
        else
          secondParent.appendChild(nextSibling);
      }
    }
    
    secondParent.replaceChild(newEl, oldEl);
  }

  // Creates the updated XML elements after a change to the offest rows
  const _recreateSubtree = (parent: Element) => {
    // Find the range of rows for this parent
    const parentRows = rows.filter(row => row.el === parent);
    if (parentRows.length === 0) return;

    const firstIndex = rows.indexOf(parentRows[0]);
    const lastIndex = rows.indexOf(parentRows[parentRows.length - 1]);

    const toUpdate = rows.slice(firstIndex, lastIndex + 1);

    // Recreate the subtree
    const [newParentEl, oldElsToNewEls] = standoff2xml(toUpdate);

    // Update the table with new elements
    for (const [oldEl, newEl] of Object.entries(oldElsToNewEls)) {
      modify.updateRow(oldEl as unknown as Element, { el: newEl });
    }

    _replaceElement(parent, newParentEl);
  }

  const addInline = (
    begin: number,
    end: number,
    tag: string,
    attrib: Record<string, string> = {}
  ) => {
    // Existing tag boundaries between begin and end
    const boundaries = query.getBoundaries(begin, end);

    const addSegment = (b: number, e: number, d?: number): Element => {
      // Get parent context
      const parents = query.getParents(b, e, d);
      const newDepth = d ?? parents.length;
  
      // Update child depths
      const children = query.getChildren(b, e, newDepth);
      for (const child of children) {
        const childRow = rows.find(row => row.el === child);
        if (childRow)
          modify.updateRow(child, { depth: childRow.depth + 1 });
      }

      // Create new element
      const newEl = _createElement(tag, attrib);
  
      // Insert the new element
      if (b === e) {
        modify.insertEmpty(b, newEl, newDepth);
      } else {
        modify.insertOpen(b, newEl, newDepth);
        modify.insertClose(e, newEl, newDepth);
      }

      return parents[parents.length - 1];
    }

    if (boundaries.length <= 2) { // Just the begin and end positions
      const parent = addSegment(begin, end);
      _recreateSubtree(parent);
    } else {
      // Create segments based on boundaries
      const segments: { start: number; end: number }[] = [];

      for (let i = 0; i < boundaries.length - 1; i++) {
        segments.push({ start: boundaries[i], end: boundaries[i + 1] });
      }

      const parents = segments.map(s => addSegment(s.start, s.end));
      
      // Root parents
      const rootParents = parents.filter(el => !parents.some(other => other !== el && other.contains(el)));
      [...rootParents].forEach(p => _recreateSubtree(p));
    }
  }

  return {
    rows: rows,
    addInline,
    getText: query.getText,
    getXPointer: query.getXPointer
  }

}