import type { StandoffTableRow, StandoffTableRowType } from './types';

export const createPositionTable = (rows: StandoffTableRow[]) => {

  const getText = () => rows
    .filter(row => row.row_type === 'text' && row.text)
    .map(row => row.text || '')
    .join('');
  
  // Returns an array of parent elements at the given position
  const getContextAtPos = (position: number): Element[] => {
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

  const setEl = (el: Element, props: Partial<StandoffTableRow>) => {
    rows.forEach((row, index) => {
      if (row.el === el)
        rows[index] = { ...row, ...props };
    });
  }

  const insertOp = (row_type: StandoffTableRowType, position: number, el: Element, depth: number) => {
    let insertIndex = rows.findIndex(row => row.position > position);
    if (insertIndex === -1) insertIndex = rows.length;
    
    const newRow: StandoffTableRow = {
      position,
      row_type,
      el,
      depth,
      text: null
    };
    
    rows.splice(insertIndex, 0, newRow);
  }
  
  const insertOpen = (position: number, el: Element, depth: number) =>
    insertOp('open', position, el, depth);

  const insertClose = (position: number, el: Element, depth: number) =>
    insertOp('close', position, el, depth);

  const insertEmpty = (position: number, el: Element, depth: number, insertIndexAtPos: number = 0) => {
    let insertIndex = rows.findIndex(row => row.position > position);
    if (insertIndex === -1) insertIndex = rows.length;
    
    // Adjust if there are multiple entries at this position
    let adjustedIndex = insertIndex;

    if (insertIndexAtPos > 0) {
      let count = 0;

      for (let i = 0; i < rows.length; i++) {
        if (rows[i].position === position) {
          count++;

          if (count === insertIndexAtPos) {
            adjustedIndex = i + 1;
            break;
          }
        }
      }
    }
    
    const newRow: StandoffTableRow = {
      position,
      row_type: 'empty',
      el,
      depth,
      text: null
    };
    
    rows.splice(adjustedIndex, 0, newRow);
  }

  return {
    rows,
    getContextAtPos,
    getText,
    insertClose,
    insertEmpty,
    insertOpen,
    setEl
  }

}