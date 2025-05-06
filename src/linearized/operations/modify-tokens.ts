import type { MarkupToken, MarkupTokenType } from '../../types';

export const createModifyOperations = (tokens: MarkupToken[]) => {

  const updateToken = (el: Element, props: Partial<MarkupToken>) => {
    tokens.forEach((token, index) => {
      if (token.el === el)
        tokens[index] = { ...token, ...props };
    });
  } 

  const _splitStringAtPosition = (position: number) => {
    // Find the text row that contains this position
    const textRows = tokens
      .filter(token => token.type === 'text' && token.position <= position)
      .sort((a, b) => b.position - a.position);
    
    if (textRows.length === 0)
      throw new Error(`Cannot split string at position: ${position}`);

    const lastTextRow = textRows[0];
    const splitAt = position - lastTextRow.position;

    if (splitAt <= 0 || !lastTextRow.text || splitAt >= lastTextRow.text.length)
      return; // No need to split

    const textBefore = lastTextRow.text.substring(0, splitAt);
    const textAfter = lastTextRow.text.substring(splitAt);
    
    const originalIndex = tokens.indexOf(lastTextRow);
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
    tokens.splice(originalIndex, 1, newTokenBefore, newTokenAfter);
  }

  const _insert = (type: MarkupTokenType, position: number, el: Element, depth: number, insertAt?: number) => {
    // 1. Ensure position exists (may split text if needed)
    if (!tokens.some(t => t.position === position)) 
      _splitStringAtPosition(position);

    // 2. Get all rows at this position
    const samePositionRows = tokens.filter(t => t.position === position);
    if (samePositionRows.length === 0)
      throw new Error('Failed to find insert position'); // Should never happen after split!
    
    // 3. Default insertion point: after all same-position rows
    let insertIndex = 
      insertAt || tokens.indexOf(samePositionRows[samePositionRows.length - 1]);

    if (!insertAt) {
      // Adjust insertIndex for depth
      if (type === 'open' || type === 'empty' || type === 'text') {
        insertIndex = samePositionRows.reduce<number>((idx, row) => {
          if (row.depth > depth) {
            // Insert before the deeper element
            return tokens.indexOf(row);
          } else {
            return idx;
          }
        }, insertIndex);
      } else if (type === 'close') {
        insertIndex = samePositionRows.reduce<number>((idx, row) => {
          if (row.depth < depth) {
            // Insert before the shallower element
            return tokens.indexOf(row);
          } else {
            return idx;
          }
        }, insertIndex);
      }
    }

    const newRow: MarkupToken = {
      position,
      type,
      el,
      depth,
      text: null
    };
    
    tokens.splice(insertIndex, 0, newRow);
  }

  const insertOpen = (position: number, el: Element, depth: number, insertAt?: number) =>
    _insert('open', position, el, depth, insertAt);

  const insertClose = (position: number, el: Element, depth: number, insertAt?: number) =>
    _insert('close', position, el, depth, insertAt);

  const insertEmpty = (position: number, el: Element, depth: number, insertAt?: number) =>
    _insert('empty', position, el, depth, insertAt);

  const removeToken = (el: Element) => {
    const indicesToRemove: number[] = [];
    tokens.forEach((row, index) => {
      if (row.el === el) indicesToRemove.push(index);
    });
    
    // Remove in reverse order to avoid index shifting issues
    indicesToRemove.sort((a, b) => b - a).forEach(index =>
      tokens.splice(index, 1));
    
    // Then merge adjacent text tokens if needed
    for (let i = 0; i < tokens.length - 1; i++) {
      const current = tokens[i];
      const next = tokens[i + 1];
      
      if (current.type === 'text' && next.type === 'text') {
        current.text = (current.text || '') + (next.text || '');
        tokens.splice(i + 1, 1);
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