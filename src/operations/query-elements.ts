import type { StandoffTableRow } from '../types';
import { createPositionTable } from '../core/position-table';

export const createQueryOperations = (rows: StandoffTableRow[]) => {
  const table = createPositionTable(rows);
  
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

  return {
    getParents,
    getChildren,
    getXPointer
  }

}