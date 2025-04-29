import { createPositionTable } from './position-table';
import type { StandoffTableRow } from './types';
import { standoff2xml } from './util';

export const StandoffTable = (rows: StandoffTableRow[]) => {

  const table = createPositionTable(rows); 

  const createElement = (tag: string, attrib?: Record<string, string>): Element => {
    const el = document.createElementNS('http://www.tei-c.org/ns/1.0', tag);
    
    if (attrib) {
      Object.entries(attrib).forEach(([key, value]) => {
        if (key === 'xml:id') {
          el.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'id', value);
        } else {
          el.setAttribute(key, value);
        }
      });
    }
    
    return el;
  }

  const getParents = (begin: number, end: number, depth: number | null = null): Element[] => {
    const beginCtx = table.getContextAtPos(begin);
    const beginParents = depth !== null ? beginCtx.slice(0, depth) : beginCtx;
    
    const endCtx = table.getContextAtPos(Math.max(begin, end - 1));
    const endParents = depth !== null ? endCtx.slice(0, depth) : endCtx;

    // Check if contexts are the same
    const beginJson = JSON.stringify(beginParents.map(el => el.tagName));
    const endJson = JSON.stringify(endParents.map(el => el.tagName));

    if (beginJson !== endJson)
      throw new Error('No unique context found');
    
    return beginParents;
  }

  const getChildren = (begin: number, end: number, depth: number | null): Element[] => {
    const beginCtx = table.getContextAtPos(begin);
    
    if (depth === null)
      depth = beginCtx.length;
    
    // Find index in table for the begin position
    let beginIdx: number;

    const posExists = table.rows.some(row => row.position === begin);
    if (!posExists) {
      // Find the last text row before this position
      const slice = rows.filter(row => 
        row.position < begin && row.row_type === 'text'
      );
      beginIdx = slice.length ? table.rows.indexOf(slice[slice.length - 1]) : 0;
    } else {
      const matches = table.rows.filter(row => 
        row.position === begin && row.row_type === 'text'
      );
      beginIdx = matches.length ? table.rows.indexOf(matches[0]) : 0;
    }
    
    // Find children
    const children = new Set<Element>();
    const cache = new Set<Element>();
    let cRowPos = begin;
    let cRowIdx = beginIdx;
    
    while (cRowPos <= end && cRowIdx < table.rows.length) {
      const cRow = table.rows[cRowIdx];
      cRowPos = cRow.position;
      
      if (cRow.row_type === 'open' && cRow.el) {
        cache.add(cRow.el);
      }
      
      if (cRow.row_type === 'close' && cRow.el && cache.has(cRow.el)) {
        children.add(cRow.el);
      }
      
      cRowIdx++;
    }
    
    return Array.from(children);
  }

  const replaceEl = (oldEl: Element, newEl: Element) => {
    const secondParent = oldEl.parentNode;
    
    if (secondParent === null) {
      // Do nothing
    } else {
      // Copy tail text if needed
      if (oldEl.nextSibling && oldEl.nextSibling.nodeType === Node.TEXT_NODE) {
        if (oldEl.nextSibling.textContent) {
          const nextSibling = document.createTextNode(oldEl.nextSibling.textContent);
          if (oldEl.nextSibling.nextSibling) {
            secondParent.insertBefore(nextSibling, oldEl.nextSibling.nextSibling);
          } else {
            secondParent.appendChild(nextSibling);
          }
        }
      }
      
      secondParent.replaceChild(newEl, oldEl);
    }
  }

  const recreateSubtree = (parent: Element) => {
    // Extract part of the standoff table that needs to be recreated
    const parentRows = table.rows.filter(row => row.el === parent);
    const parentBeginIdx = table.rows.indexOf(parentRows[0]);
    const parentEndIdx = table.rows.indexOf(parentRows[parentRows.length - 1]);

    const toUpdate = table.rows.slice(parentBeginIdx, parentEndIdx + 1);
    
    // Recreate the subtree
    const [newParentEl, oldEls2newEls] = standoff2xml(toUpdate);
    
    for (const [oldEl, newEl] of oldEls2newEls.entries()) {      
      table.setEl(oldEl, { el: newEl });
    }

    console.log('replacing', parent, newParentEl);
    
    replaceEl(parent, newParentEl);
  }

  const addInlineElement = (
    begin: number, 
    end: number, 
    tag: string, 
    depth: number | null = null, 
    attrib: Record<string, string> | null = {}, 
    insertIndexAtPos: number = 0
  ) => {
    const newEl = createElement(tag, attrib);
    const parents = getParents(begin, end, depth);
    const parent = parents[parents.length - 1];
    
    // Set depth and handle children's depth
    const newDepth = depth !== null ? depth : parents.length;
    const children = getChildren(begin, end, newDepth);
    
    // Increment depth for children
    for (const child of children) {
      const childRow = table.rows.find(row => row.el === child);
      if (childRow && childRow.depth !== null)
        table.setEl(child, { depth: childRow.depth + 1 });
    }
    
    if (begin === end) {
      table.insertEmpty(begin, newEl, newDepth, insertIndexAtPos);
    } else {
      table.insertOpen(begin, newEl, newDepth);
      table.insertClose(end, newEl, newDepth);
    }
    
    recreateSubtree(parent);
  }
  
  const getXPointer = (charOffset: number) => {
    const rowsBefore = table.rows.filter(row => row.position <= charOffset);

    const parents = table.getContextAtPos(charOffset);
    const tags = parents.map(el => (el as HTMLElement).dataset.origname);
    
    const offset = charOffset - rowsBefore[rowsBefore.length - 1].position;

    return`/${tags.join('/')}::${offset}`;
  }

  return {
    addInlineElement,
    getXPointer,
    rows: table.rows
  }

}