import { standoff2xml } from '../conversion';
import type { StandoffTableRow } from '../types';
import { createModifyOperations, createQueryOperations } from './operations';

export const createStandoffTable = (rows: StandoffTableRow[], namespace = 'http://www.tei-c.org/ns/1.0') => {

  const query = createQueryOperations(rows);

  const modify = createModifyOperations(rows);

  const _createElement = (tag: string, attrib?: Record<string, string>): Element => {
    const el = document.createElementNS(namespace, tag);
    
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
        const nextSibling = document.createTextNode(oldEl.nextSibling.textContent);

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
    depth?: number,
    attrib: Record<string, string> = {}
  ) => {
    // Create new element
    const newEl = _createElement(tag, attrib);
    
    // Get parent context
    const parents = query.getParents(begin, end, depth);
    const parent = parents[parents.length - 1];

    // Handle depth
    const newDepth = depth ?? parents.length;

    // Update child depths
    const children = query.getChildren(begin, end, newDepth);
    for (const child of children) {
      const childRow = rows.find(row => row.el === child);
      if (childRow)
        modify.updateRow(child, { depth: childRow.depth + 1 });
    }

    // Insert the new element
    if (begin === end) {
      modify.insertEmpty(begin, newEl, newDepth);
    } else {
      modify.insertOpen(begin, newEl, newDepth);
      modify.insertClose(end, newEl, newDepth);
    }

    console.log(rows);

    // Recreate the affected subtree
    _recreateSubtree(parent);
  }


  return {
    rows: rows,
    addInline,
    getXPointer: query.getXPointer
  }

}