import { Constants } from '../../dom';
import type { Element, MarkupToken } from '../../types';

export const createQueryOperations = (rows: MarkupToken[]) => {

  const toText = () => rows
    .filter(row => row.type === 'text' && row.text)
    .map(row => row.text || '')
    .join('');

  const toJSON = () => rows
    .map(row => ({
      position: row.position,
      type: row.type,
      tag: row.el?.tagName,
      // attributes: TODO!
      depth: row.depth,
      text: row.text
    }));

  // Returns an array of parent elements at the given position
  const getParentsAtPos = (position: number): Element[] => {
    const rowsBefore = rows.filter(row => row.position <= position);
    
    const stack: Element[] = [];

    for (const row of rowsBefore) {
      if (row.type === 'open' && row.el) {
        stack.push(row.el);
      } else if (row.type === 'close' && row.el) {
        // Remove the element if it's in the stack
        const index = stack.findIndex(el => el === row.el);
        if (index !== -1) {
          stack.splice(index, 1);
        }
      }
    }
    
    return stack;
  }

  const getBoundaries = (begin: number, end: number): number[] => {
    // Always nclude begin and end positions
    const boundaries = new Set<number>([begin, end]);
    
    // Find all tag boundaries between begin and end
    rows.forEach(row => {
      // Only consider open and close tags
      if ((row.type === 'open' || row.type === 'close') && 
          row.position > begin && 
          row.position < end) {
        boundaries.add(row.position);
      }
    });
    
    return Array.from(boundaries).sort((a, b) => a - b);
  }

  const getParents = (begin: number, end: number, depth: number | null = null): Element[] => {
    const beginCtx = getParentsAtPos(begin);
    const beginParents = depth !== null ? beginCtx.slice(0, depth) : beginCtx;
    
    const endCtx = getParentsAtPos(Math.max(begin, end - 1));
    const endParents = depth !== null ? endCtx.slice(0, depth) : endCtx;

    // Check if contexts are the same
    const beginJson = JSON.stringify(beginParents.map(el => el.tagName));
    const endJson = JSON.stringify(endParents.map(el => el.tagName));

    if (beginJson !== endJson)
      throw new Error('No unique context found');
    
    return beginParents;
  }

  const getChildren = (begin: number, end: number, depth: number | null): Element[] => {
    const beginCtx = getParentsAtPos(begin);
    
    if (depth === null)
      depth = beginCtx.length;
    
    // Find index in table for the begin position
    let beginIdx: number;

    const posExists = rows.some(row => row.position === begin);
    if (!posExists) {
      // Find the last text row before this position
      const slice = rows.filter(row => 
        row.position < begin && row.type === 'text'
      );
      beginIdx = slice.length ? rows.indexOf(slice[slice.length - 1]) : 0;
    } else {
      const matches = rows.filter(row => 
        row.position === begin && row.type === 'text'
      );
      beginIdx = matches.length ? rows.indexOf(matches[0]) : 0;
    }
    
    // Find children
    const children = new Set<Element>();
    const cache = new Set<Element>();
    let cRowPos = begin;
    let cRowIdx = beginIdx;
    
    while (cRowPos <= end && cRowIdx < rows.length) {
      const cRow = rows[cRowIdx];
      cRowPos = cRow.position;
      
      if (cRow.type === 'open' && cRow.el) {
        cache.add(cRow.el);
      }
      
      if (cRow.type === 'close' && cRow.el && cache.has(cRow.el)) {
        children.add(cRow.el);
      }
      
      cRowIdx++;
    }
    
    return Array.from(children);
  }

  const getAnnotations = () => rows.filter(row => {
    if (!row.el) return false;
    const el = (row.el as HTMLElement);
    const nodeName = el.dataset?.origname || el.tagName;
    return nodeName.toLowerCase() === 'annotation';
  });

  const getXPointer = (charOffset: number) => {
    
    const getXPointerRecursive = (el: Element, segments: string[] = []) => {      
      if (el.nodeType === Constants.ELEMENT_NODE && el.hasAttribute('xml:id')) {
        segments.push('/');
      } else if (el.parentElement) {
        segments = getXPointerRecursive(el.parentElement, segments);
      }
      
      if (el.nodeType === Constants.ELEMENT_NODE) {      
        let predicate: string;

        if (el.hasAttribute('xml:id')) {
          predicate = `[@xml:id='${el.getAttribute('xml:id')}']`;
        } else {
          let count = 1;
          let sibling = el.previousSibling;

          while (sibling) {
            // Only count element siblings with the same tag name
            if (
              sibling.nodeType === Constants.ELEMENT_NODE &&
              (sibling as any).tagName === el.tagName
            ) {
              count++;
            }
            sibling = sibling.previousSibling;
          }

          predicate = `[${count}]`;
        }
    
        segments.push('/');
        segments.push((el.getAttribute('data-origname') || el.tagName) + predicate);
      }
      
      return segments;
    }

    const parents = rows.filter(row => row.position <= charOffset && row.type === 'open');
    if (parents.length === 0)
      throw new Error(`Invalid offset: ${charOffset}`);

    const parent = parents[parents.length - 1];
    const path = getXPointerRecursive(parent.el);
    
    return`${path.join('')}::${charOffset - parent.position}`;
  }

  return {
    getAnnotations,
    getBoundaries,
    getChildren,
    getParents,
    getParentsAtPos,
    getXPointer,
    toJSON,
    toText
  }

}