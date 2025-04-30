import type { StandoffTableRow } from '../../types';

export const createQueryOperations = (rows: StandoffTableRow[]) => {

  const getText = () => rows
    .filter(row => row.row_type === 'text' && row.text)
    .map(row => row.text || '')
    .join('');

  // Returns an array of parent elements at the given position
  const getParentsAtPos = (position: number): Element[] => {
    const rowsBefore = rows.filter(row => row.position <= position);
    
    const stack: Element[] = [];

    for (const row of rowsBefore) {
      if (row.row_type === 'open' && row.el) {
        stack.push(row.el);
      } else if (row.row_type === 'close' && row.el) {
        // Remove the element if it's in the stack
        const index = stack.findIndex(el => el === row.el);
        if (index !== -1) {
          stack.splice(index, 1);
        }
      }
    }
    
    return stack;
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
        row.position < begin && row.row_type === 'text'
      );
      beginIdx = slice.length ? rows.indexOf(slice[slice.length - 1]) : 0;
    } else {
      const matches = rows.filter(row => 
        row.position === begin && row.row_type === 'text'
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
    const rowsBefore = rows.filter(row => row.position <= charOffset);

    const parents = getParentsAtPos(charOffset);
    const tags = parents.map(el => (el as HTMLElement).dataset.origname);
    
    const offset = charOffset - rowsBefore[rowsBefore.length - 1].position;

    return`/${tags.join('/')}::${offset}`;
  }

  return {
    getChildren,
    getParents,
    getParentsAtPos,
    getText,
    getXPointer
  }

}