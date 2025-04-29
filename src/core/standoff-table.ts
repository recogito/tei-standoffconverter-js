import type { StandoffTableRow } from '../types';
import { standoff2xml } from '../conversion';
import { createPositionTable } from './position-table';

export const StandoffTable = (rows: StandoffTableRow[], namespace = 'http://www.tei-c.org/ns/1.0') => {

  const table = createPositionTable(rows); 

  const createElement = (tag: string, attrib?: Record<string, string>): Element => {
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
  
  const getXPointer = (charOffset: number) => {
    const rowsBefore = table.rows.filter(row => row.position <= charOffset);

    const parents = table.getContextAtPos(charOffset);
    const tags = parents.map(el => (el as HTMLElement).dataset.origname);
    
    const offset = charOffset - rowsBefore[rowsBefore.length - 1].position;

    return`/${tags.join('/')}::${offset}`;
  }

  const recreateSubtree = (parent: Element) => {
    // Find the range of rows for this parent
    const parentRows = table.rows.filter(row => row.el === parent);
    if (parentRows.length === 0) return;

    const firstIndex = table.rows.indexOf(parentRows[0]);
    const lastIndex = table.rows.indexOf(parentRows[parentRows.length - 1]);

    const toUpdate = table.rows.slice(firstIndex, lastIndex + 1);

    // Recreate the subtree
    const [newParentEl, oldElsToNewEls] = standoff2xml(toUpdate);

    // Update the table with new elements
    for (const [oldEl, newEl] of Object.entries(oldElsToNewEls)) {
        table.setEl(oldEl as unknown as Element, { el: newEl });
    }

    replaceEl(parent, newParentEl);
}

  const addInline = (
    begin: number,
    end: number,
    tag: string,
    depth?: number,
    attrib: Record<string, string> = {},
    insertIndexAtPos: number = 0
  ) => {
    // Create new element
    const newEl = createElement(tag, attrib);
    
    // Get parent context
    const parents = getParents(begin, end, depth);
    const parent = parents[parents.length - 1];

    // Handle depth
    const newDepth = depth ?? parents.length;

    // Update children depths
    const children = getChildren(begin, end, newDepth);
    for (const child of children) {
        const childRow = table.rows.find(row => row.el === child);
        if (childRow) {
            table.setEl(child, { depth: childRow.depth + 1 });
        }
    }

    // Insert the new element
    if (begin === end) {
        table.insertEmpty(begin, newEl, newDepth, insertIndexAtPos);
    } else {
        table.insertOpen(begin, newEl, newDepth);
        table.insertClose(end, newEl, newDepth);
    }

    console.log(table.rows);

    // Recreate the affected subtree
    recreateSubtree(parent);
}

  return {
    rows,
    addInline,
    getXPointer
  }

}