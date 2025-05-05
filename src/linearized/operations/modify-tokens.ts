import type { MarkupToken, MarkupTokenType } from '../../types';

export const createModifyOperations = (rows: MarkupToken[]) => {

  const updateToken = (el: Element, props: Partial<MarkupToken>) => {
    rows.forEach((row, index) => {
      if (row.el === el)
        rows[index] = { ...row, ...props };
    });
  } 

  const _splitStringAtPosition = (position: number) => {
    // Find the text row that contains this position
    const textRows = rows
      .filter(row => row.type === 'text' && row.position <= position)
      .sort((a, b) => b.position - a.position);
    
    if (textRows.length === 0)
      throw new Error(`Cannot split string at position: ${position}`);

    const lastTextRow = textRows[0];
    const splitAt = position - lastTextRow.position;

    if (splitAt <= 0 || !lastTextRow.text || splitAt >= lastTextRow.text.length)
      return; // No need to split

    const textBefore = lastTextRow.text.substring(0, splitAt);
    const textAfter = lastTextRow.text.substring(splitAt);
    
    const originalIndex = rows.indexOf(lastTextRow);
    if (originalIndex === -1) return;  // Should never happen

    const newTokenBefore: MarkupToken = {
      position: lastTextRow.position,
      type: 'text',
      el: null,
      depth: lastTextRow.depth,
      text: textBefore
    };
    
    const newTokenAfter: MarkupToken = {
      position: position,
      type: 'text',
      el: null,
      depth: lastTextRow.depth,
      text: textAfter
    };
    
    // Replace the original row with the two new ones
    rows.splice(originalIndex, 1, newTokenBefore, newTokenAfter);
  }

  const _insert = (type: MarkupTokenType, position: number, el: Element, depth: number) => {
    // 1. Ensure position exists (may split text if needed)
    if (!rows.some(row => row.position === position)) 
      _splitStringAtPosition(position);

    // 2. Get all rows at this position
    const samePositionRows = rows.filter(row => row.position === position);
    if (samePositionRows.length === 0)
      throw new Error('Failed to find insert position'); // Should never happen after split!
    
    // 3. Default insertion point: after all same-position rows
    const insertIndex = rows.indexOf(samePositionRows[samePositionRows.length - 1]);

    const newRow: MarkupToken = {
      position,
      type,
      el,
      depth,
      text: null
    };
    
    rows.splice(insertIndex, 0, newRow);
  }

  const insertOpen = (position: number, el: Element, depth: number) =>
    _insert('open', position, el, depth);

  const insertClose = (position: number, el: Element, depth: number) =>
    _insert('close', position, el, depth);

  const insertEmpty = (position: number, el: Element, depth: number) =>
    _insert('empty', position, el, depth);

  const removeToken = (el: Element) => {
    const indicesToRemove: number[] = [];
    rows.forEach((row, index) => {
      if (row.el === el) indicesToRemove.push(index);
    });
    
    // Remove in reverse order to avoid index shifting issues
    indicesToRemove.sort((a, b) => b - a).forEach(index =>
      rows.splice(index, 1));
    
    // Then merge adjacent text rows if needed
    for (let i = 0; i < rows.length - 1; i++) {
      const current = rows[i];
      const next = rows[i + 1];
      
      if (current.type === 'text' && next.type === 'text') {
        // Merge them
        current.text = (current.text || '') + (next.text || '');
        rows.splice(i + 1, 1);
        i--; // Check again in case there are more adjacent text rows
      }
    }
  }

  return {
    insertClose,
    insertEmpty,
    insertOpen,
    removeToken,
    updateToken
  }

}