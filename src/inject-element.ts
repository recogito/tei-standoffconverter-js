import type { StandoffTableRow } from './types';

/**
 * Finds the index of the row that contains or is at the given position
 */
const findRowIndexForPosition = (rows: StandoffTableRow[], position: number): number => {
  // First try to find exact position match
  const exactMatchIndex = rows.findIndex(row => row.position === position);
  if (exactMatchIndex !== -1) return exactMatchIndex;
  
  // If no exact match, find the last row before this position
  const nextRowIndex = rows.findIndex(row => row.position > position);
  return nextRowIndex === -1 ? rows.length - 1 : nextRowIndex - 1;
}

/**
 * Injects a new element at specified plaintext character positions.
 */
export const injectElement = (
  rows: StandoffTableRow[],
  start: number,
  end: number,
  tagName: string,
  attributes: Record<string, string> = {}
): StandoffTableRow[] => {
  if (start > end)
    throw new Error(`Invalid position: start=${start}, end=${end}`);

  const updatedRows = [...rows];
  
  // Find the rows that contain or are at the boundaries of our injection points
  const startRowIndex = findRowIndexForPosition(updatedRows, start);
  const endRowIndex = findRowIndexForPosition(updatedRows, end);
  
  if (startRowIndex === -1 || endRowIndex === -1)
    throw new Error(`Invalid position: start=${start}, end=${end}`);

  // Create the new element
  const newElement = document.createElementNS('http://www.tei-c.org/ns/1.0', tagName);
  
  // Add attributes to the new element
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'xml:id') {
      newElement.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'id', value);
    } else {
      newElement.setAttribute(key, value);
    }
  });
  
  // Determine the depth for the new element
  const startContext = getContextAtPos(updatedRows, start);
  const depth = startContext.length;
  
  // Handle the case where start and end positions are in the same text node
  if (startRowIndex === endRowIndex && updatedRows[startRowIndex].row_type === 'text') {
    splitTextNodeAndInsertElement(updatedRows, startRowIndex, start, end, newElement, depth);
  } else {
    // Handle start position
    if (updatedRows[startRowIndex].row_type === 'text') {
      splitTextNodeAtStart(updatedRows, startRowIndex, start, newElement, depth);
    } else {
      // Insert open tag at the appropriate position
      insertOpenTag(updatedRows, startRowIndex, start, newElement, depth);
    }
    
    // Handle end position
    if (updatedRows[endRowIndex].row_type === 'text') {
      splitTextNodeAtEnd(updatedRows, endRowIndex, end, newElement, depth);
    } else {
      // Insert close tag at the appropriate position
      insertCloseTag(updatedRows, endRowIndex, end, newElement, depth);
    }
  }
  
  // Update positions for all rows after modifications
  updatePositions(updatedRows);
  
  return updatedRows;
}

const getContextAtPos = (rows: StandoffTableRow[], position: number): Element[] => {
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

/**
 * Splits a text node and inserts our new element completely within it
 */
const splitTextNodeAndInsertElement = (
  rows: StandoffTableRow[],
  rowIndex: number,
  start: number,
  end: number,
  newElement: Element,
  depth: number
) => {
  const row = rows[rowIndex];
  const text = row.text || '';
  const relStart = start - row.position;
  const relEnd = end - row.position;
  
  // Create three text segments: before, inside, and after
  const beforeText = text.substring(0, relStart);
  const insideText = text.substring(relStart, relEnd);
  const afterText = text.substring(relEnd);
  
  // Replace the current row with up to 5 new rows:
  // 1. Text before the new element (if any)
  // 2. Open tag for the new element
  // 3. Text inside the new element (if any)
  // 4. Close tag for the new element
  // 5. Text after the new element (if any)
  const newRowsToInsert: StandoffTableRow[] = [];
  
  // Text before
  if (beforeText) {
    newRowsToInsert.push({
      position: row.position,
      row_type: 'text',
      el: row.el,
      depth: row.depth,
      text: beforeText
    });
  }
  
  // Open tag
  newRowsToInsert.push({
    position: start,
    row_type: 'open',
    el: newElement,
    depth,
    text: null
  });
  
  // Text inside
  if (insideText) {
    newRowsToInsert.push({
      position: start,
      row_type: 'text',
      el: row.el,
      depth: row.depth ? row.depth + 1 : depth + 1, // Increment depth for content inside the new tag
      text: insideText
    });
  }
  
  // Close tag
  newRowsToInsert.push({
    position: end,
    row_type: 'close',
    el: newElement,
    depth,
    text: null
  });
  
  // Text after
  if (afterText) {
    newRowsToInsert.push({
      position: end,
      row_type: 'text',
      el: row.el,
      depth: row.depth,
      text: afterText
    });
  }
  
  // Replace the original row with the new rows
  rows.splice(rowIndex, 1, ...newRowsToInsert);
}

/**
 * Splits a text node at the start position and inserts the opening tag
 */
const splitTextNodeAtStart = (
  rows: StandoffTableRow[],
  rowIndex: number,
  position: number,
  newElement: Element,
  depth: number
) => {
  const row = rows[rowIndex];
  const text = row.text || '';
  const relPosition = position - row.position;
  
  // Create two text segments: before and after
  const beforeText = text.substring(0, relPosition);
  const afterText = text.substring(relPosition);
  
  // Replace the current row with up to 3 new rows:
  // 1. Text before the new element (if any)
  // 2. Open tag for the new element
  // 3. Text after (now inside the new element) (if any)
  const newRowsToInsert: StandoffTableRow[] = [];
  
  // Text before
  if (beforeText) {
    newRowsToInsert.push({
      position: row.position,
      row_type: 'text',
      el: row.el,
      depth: row.depth,
      text: beforeText
    });
  }
  
  // Open tag
  newRowsToInsert.push({
    position: position,
    row_type: 'open',
    el: newElement,
    depth,
    text: null
  });
  
  // Text after (now inside the new element)
  if (afterText) {
    newRowsToInsert.push({
      position: position,
      row_type: 'text',
      el: row.el,
      depth: row.depth ? row.depth + 1 : depth + 1, // Increment depth for content inside the new tag
      text: afterText
    });
  }
  
  // Replace the original row with the new rows
  rows.splice(rowIndex, 1, ...newRowsToInsert);
}

/**
 * Splits a text node at the end position and inserts the closing tag
 */
const splitTextNodeAtEnd = (
  rows: StandoffTableRow[],
  rowIndex: number,
  position: number,
  newElement: Element,
  depth: number
) => {
  const row = rows[rowIndex];
  const text = row.text || '';
  const relPosition = position - row.position;
  
  // Create two text segments: before (inside the element) and after
  const beforeText = text.substring(0, relPosition);
  const afterText = text.substring(relPosition);
  
  // Replace the current row with up to 3 new rows:
  // 1. Text before (inside the element) (if any)
  // 2. Close tag for the new element
  // 3. Text after the new element (if any)
  const newRowsToInsert: StandoffTableRow[] = [];
  
  // Text before (inside the element)
  if (beforeText) {
    newRowsToInsert.push({
      position: row.position,
      row_type: 'text',
      el: row.el,
      depth: row.depth, // Keep the depth as it should already be incremented
      text: beforeText
    });
  }
  
  // Close tag
  newRowsToInsert.push({
    position: position,
    row_type: 'close',
    el: newElement,
    depth,
    text: null
  });
  
  // Text after
  if (afterText) {
    newRowsToInsert.push({
      position: position,
      row_type: 'text',
      el: row.el,
      depth: row.depth ? row.depth - 1 : (depth > 0 ? depth - 1 : 0), // Decrement depth for content after the tag
      text: afterText
    });
  }
  
  // Replace the original row with the new rows
  rows.splice(rowIndex, 1, ...newRowsToInsert);
}

/**
 * Inserts an open tag at a non-text position
 */
const insertOpenTag = (
  rows: StandoffTableRow[],
  rowIndex: number,
  position: number,
  newElement: Element,
  depth: number
) => {
  // Find the correct insertion point
  const insertionIndex = findInsertionIndexAtPosition(rows, rowIndex, position);
  
  // Insert the open tag
  rows.splice(insertionIndex, 0, {
    position,
    row_type: 'open',
    el: newElement,
    depth,
    text: null
  });
  
  // Update depth for all subsequent text nodes until the end position
  updateDepthAfterOpen(rows, insertionIndex + 1, newElement);
}

/**
 * Inserts a close tag at a non-text position
 */
function insertCloseTag(
  rows: StandoffTableRow[],
  rowIndex: number,
  position: number,
  newElement: Element,
  depth: number
): void {
  // Find the correct insertion point
  const insertionIndex = findInsertionIndexAtPosition(rows, rowIndex, position);
  
  // Insert the close tag
  rows.splice(insertionIndex, 0, {
    position,
    row_type: 'close',
    el: newElement,
    depth,
    text: null
  });
  
  // Update depth for all preceding text nodes since the start position
  updateDepthAfterClose(rows, insertionIndex, newElement);
}

/**
 * Finds the correct insertion index at a given position
 */
const findInsertionIndexAtPosition = (
  rows: StandoffTableRow[],
  startIndex: number,
  position: number
): number => {
  // Start from the given index and find the appropriate insertion point
  let index = startIndex;
  
  // Move forward if we're at a position less than the target
  while (index < rows.length && rows[index].position < position) {
    index++;
  }
  
  // At this point, we're either at the end or at a position >= our target
  // For positions that match exactly, we need to determine the proper insertion order
  if (index < rows.length && rows[index].position === position) {
    // Establish a priority order for row types at the same position
    const priority: Record<string, number> = {
      'close': 1,  // Close tags come first
      'text': 2,   // Then text nodes
      'open': 3    // Then open tags
    };
    
    // Find the right spot based on priority
    while (index < rows.length && 
           rows[index].position === position && 
           (priority[rows[index].row_type] || 0) <= priority['open']) {
      index++;
    }
  }
  
  return index;
}

/**
 * Updates depths of nodes after inserting an open tag
 */
const updateDepthAfterOpen = (
  rows: StandoffTableRow[],
  startIndex: number,
  newElement: Element
) => {
  // Increment depth for all text nodes until we find the matching close tag
  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    
    // Stop when we find the matching close tag
    if (row.row_type === 'close' && row.el === newElement) {
      break;
    }
    
    // Increment depth for text nodes
    if (row.row_type === 'text' && row.depth !== null) {
      row.depth += 1;
    }
  }
}

/**
 * Updates depths of nodes after inserting a close tag
 */
const updateDepthAfterClose = (
  rows: StandoffTableRow[],
  endIndex: number,
  newElement: Element
) => {
  // Decrement depth for all text nodes since we found the matching open tag
  for (let i = endIndex - 1; i >= 0; i--) {
    const row = rows[i];
    
    // Stop when we find the matching open tag
    if (row.row_type === 'open' && row.el === newElement) {
      break;
    }
    
    // Decrement depth for text nodes
    if (row.row_type === 'text' && row.depth !== null && row.depth > 0) {
      row.depth -= 1;
    }
  }
}

/**
 * Updates positions for all rows after modifications
 */
const updatePositions = (rows: StandoffTableRow[]) => {
  // Scan through the rows and fix any position inconsistencies
  for (let i = 1; i < rows.length; i++) {
    const prevRow = rows[i - 1];
    const currentRow = rows[i];
    
    // If the previous row was a text node, the next position should be 
    // the previous position plus the text length
    if (prevRow.row_type === 'text' && prevRow.text) {
      if (currentRow.position !== prevRow.position + prevRow.text.length) {
        currentRow.position = prevRow.position + prevRow.text.length;
      }
    } 
    // For non-text nodes at the same position, keep them at the same position
    else if (currentRow.position < prevRow.position && 
             !(currentRow.row_type === 'text' && currentRow.text === '')) {
      currentRow.position = prevRow.position;
    }
  }
}