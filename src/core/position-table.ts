import type { PositionTable, StandoffTableRow, StandoffTableRowType } from '../types';

export const createPositionTable = (rows: StandoffTableRow[]): PositionTable => {

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

  // Helper function to split a text row into two at a given position
  const splitStringAtPosition = (position: number) => {
    // Find the text row that contains this position
    const textRows = rows
      .filter(row => row.row_type === 'text' && row.position <= position)
      .sort((a, b) => b.position - a.position); // Get last one first
    
    if (textRows.length === 0) return;

    const lastTextRow = textRows[0];
    const splitPos = position - lastTextRow.position;
    
    if (splitPos <= 0 || !lastTextRow.text || splitPos >= lastTextRow.text.length) {
      return; // No need to split
    }

    const text1 = lastTextRow.text.substring(0, splitPos);
    const text2 = lastTextRow.text.substring(splitPos);
    
    // Find the index of the original row
    const originalIndex = rows.findIndex(row => 
      row.position === lastTextRow.position && 
      row.row_type === 'text' && 
      row.text === lastTextRow.text
    );
    
    if (originalIndex === -1) return;

    // Create two new rows
    const newRow1: StandoffTableRow = {
      position: lastTextRow.position,
      row_type: 'text',
      el: null,
      depth: lastTextRow.depth,
      text: text1
    };
    
    const newRow2: StandoffTableRow = {
      position: position,
      row_type: 'text',
      el: null,
      depth: lastTextRow.depth,
      text: text2
    };
    
    // Replace the original row with the two new ones
    rows.splice(originalIndex, 1, newRow1, newRow2);
  }

  const insertOp = (row_type: StandoffTableRowType, position: number, el: Element, depth: number) => {
    // Ensure we have a text node at this position
    if (!rows.some(row => row.position === position && row.row_type === 'text')) {
      splitStringAtPosition(position);
    }
    
    let insertIndex = rows.findIndex(row => row.position > position);
    if (insertIndex === -1) insertIndex = rows.length;
    
    // Find the correct position to insert based on depth
    const samePositionRows = rows.filter(row => row.position === position);
    let adjustedIndex = insertIndex;
    
    if (row_type === 'open') {
      // Insert after all rows with depth < new_depth at this position
      const firstDeeperIndex = samePositionRows.findIndex(row => !(row.depth < depth));
      if (firstDeeperIndex !== -1) {
        const rowInTable = rows.findIndex(r => 
          r.position === position && 
          r.depth === samePositionRows[firstDeeperIndex].depth
        );
        adjustedIndex = rowInTable;
      }
    } else if (row_type === 'close') {
      // Insert after all rows with depth > new_depth at this position
      const firstShallowerIndex = samePositionRows.findIndex(row => !(row.depth > depth));
      if (firstShallowerIndex !== -1) {
        const rowInTable = rows.findIndex(r => 
          r.position === position && 
          r.depth === samePositionRows[firstShallowerIndex].depth
        );
        adjustedIndex = rowInTable;
      }
    }
    
    const newRow: StandoffTableRow = {
      position,
      row_type,
      el,
      depth,
      text: null
    };
    
    rows.splice(adjustedIndex, 0, newRow);
  }
  
  const insertOpen = (position: number, el: Element, depth: number) =>
    insertOp('open', position, el, depth);

  const insertClose = (position: number, el: Element, depth: number) =>
    insertOp('close', position, el, depth);

  const insertEmpty = (position: number, el: Element, depth: number, insertIndexAtPos: number = 0) => {
    // Ensure we have a text node at this position
    if (!rows.some(row => row.position === position && row.row_type === 'text')) {
      splitStringAtPosition(position);
    }
    
    let insertIndex = rows.findIndex(row => row.position > position);
    if (insertIndex === -1) insertIndex = rows.length;
    
    // Adjust if there are multiple entries at this position
    let adjustedIndex = insertIndex;

    if (insertIndexAtPos > 0) {
      let count = 0;
      const samePositionRows = rows.filter(row => row.position === position);
      
      // Find candidate positions for empty element insertion
      const candidates: number[] = [];
      
      samePositionRows.forEach((row, i) => {
        const absoluteIndex = rows.findIndex(r => 
          r.position === row.position && 
          r.row_type === row.row_type && 
          r.depth === row.depth
        );
        
        if (row.row_type === 'close' && row.depth + 1 === depth) {
          candidates.push(absoluteIndex - 0.5);
        } else if (row.row_type === 'open' && row.depth + 1 === depth) {
          candidates.push(absoluteIndex + 0.5);
        } else if (row.row_type === 'empty' && row.depth === depth) {
          candidates.push(absoluteIndex + 0.5);
        } else if (row.row_type === 'text') {
          candidates.push(absoluteIndex - 0.5);
        }
      });
      
      // Get unique sorted candidates
      const uniqueCandidates = [...new Set(candidates)].sort((a, b) => a - b);
      
      if (uniqueCandidates.length > insertIndexAtPos) {
        adjustedIndex = uniqueCandidates[insertIndexAtPos];
      }
    }
    
    const newRow: StandoffTableRow = {
      position,
      row_type: 'empty',
      el,
      depth,
      text: null
    };
    
    // Handle fractional indices (insert between existing rows)
    if (Number.isInteger(adjustedIndex)) {
      rows.splice(adjustedIndex, 0, newRow);
    } else {
      const lower = Math.floor(adjustedIndex);
      rows.splice(lower + 1, 0, newRow);
    }
  }

  const removeEl = (el: Element) => {
    // First remove all rows with this element
    const indicesToRemove: number[] = [];
    rows.forEach((row, index) => {
      if (row.el === el) {
        indicesToRemove.push(index);
      }
    });
    
    // Remove in reverse order to avoid index shifting issues
    indicesToRemove.sort((a, b) => b - a).forEach(index => {
      rows.splice(index, 1);
    });
    
    // Then merge adjacent text rows if needed
    for (let i = 0; i < rows.length - 1; i++) {
      const current = rows[i];
      const next = rows[i + 1];
      
      if (current.row_type === 'text' && next.row_type === 'text') {
        // Merge them
        current.text = (current.text || '') + (next.text || '');
        rows.splice(i + 1, 1);
        i--; // Check again in case there are more adjacent text rows
      }
    }
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