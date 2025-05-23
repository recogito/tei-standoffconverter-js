import { Constants } from '../../dom';
import type { MarkupToken } from '../../types';

export const createQueryOperations = (tokens: MarkupToken[]) => {

  const toText = () => tokens
    .filter(t => t.type === 'text' && t.text)
    .map(t => t.text || '')
    .join('');

  const getText = (from: number, to: number) => toText().substring(from, to);

  const toJSON = () => tokens
    .map(t => ({
      position: t.position,
      type: t.type,
      tag: t.el?.tagName,
      // attributes: TODO!
      depth: t.depth,
      text: t.text
    }));

  // Returns an array of parent elements at the given position
  const getParentsAtPos = (position: number): Element[] => {
    const tokensBefore = tokens.filter(t => t.position <= position);
    
    const stack: Element[] = [];

    for (const token of tokensBefore) {
      if (token.type === 'open' && token.el) {
        stack.push(token.el);
      } else if (token.type === 'close' && token.el) {
        // Remove the element if it's in the stack
        const index = stack.findIndex(el => el === token.el);
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
    tokens.forEach(t => {
      // Only consider open and close tags
      if ((t.type === 'open' || t.type === 'close') && 
          t.position > begin && 
          t.position < end) {
        boundaries.add(t.position);
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

    const posExists = tokens.some(t => t.position === begin);
    if (!posExists) {
      // Find the last text row before this position
      const slice = tokens.filter(t => 
        t.position < begin && t.type === 'text'
      );
      beginIdx = slice.length ? tokens.indexOf(slice[slice.length - 1]) : 0;
    } else {
      const matches = tokens.filter(t => 
        t.position === begin && t.type === 'text'
      );
      beginIdx = matches.length ? tokens.indexOf(matches[0]) : 0;
    }
    
    // Find children
    const children = new Set<Element>();
    const cache = new Set<Element>();
    let cRowPos = begin;
    let cRowIdx = beginIdx;
    
    while (cRowPos <= end && cRowIdx < tokens.length) {
      const cRow = tokens[cRowIdx];
      cRowPos = cRow.position;
      
      if (cRow.type === 'open' && cRow.el && cRow.depth > depth) {
        cache.add(cRow.el);
      }
      
      if (cRow.type === 'close' && cRow.el && cache.has(cRow.el)) {
        children.add(cRow.el);
      }
      
      cRowIdx++;
    }
    
    return Array.from(children);
  }

  const findByTagName = (tagName: string) => tokens.filter(t => {
    const n = t.el?.getAttribute('data-origname') || t.el?.tagName;
    return n === tagName;
  });

  const findNext = (rowIndex: number, tagName: string) => {
    for (let i = rowIndex + 1; i < tokens.length; i++) {
      const token = tokens[i];
      const n = token.el?.getAttribute('data-origname') || token.el?.tagName;
      if (n === tagName)
        return token;
    }
    return null;
  }

  const findPrevious = (rowIndex: number, tagName: string) => {
    for (let i = rowIndex - 1; i >= 0; i--) {
      const token = tokens[i];
      const n = token.el?.getAttribute('data-origname') || token.el?.tagName;
      if (n === tagName)
        return token;
    }
    return null;
  }

  const findLastClosed = (tagName: string) => {
    const closed = findByTagName(tagName).filter(t => t.type === 'close');
    return (closed.length === 0) ? undefined : closed[closed.length - 1];
  }

  const getAnnotations = (standOffId?: string) => tokens.filter(t => {
    if (!t.el) return false;
    const el = (t.el as HTMLElement);
    const nodeName = el.dataset?.origname || el.tagName;

    if (nodeName.toLowerCase() !== 'annotation')
      return false; 

    if (standOffId) {
      const parents = getParentsAtPos(t.position);
      return parents.some(el => el.getAttribute('xml:id') === standOffId);
    }

    return true;
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

    // We need to the last open tag before this position. Note that the 
    // tag MUST STILL BE OPEN, which means we need to ignore any tag that
    // got openend and closed before
    const openTokens: MarkupToken[] = [];

    for (const t of tokens) {
      if (t.position > charOffset) break;

      if (t.type === 'open') {
        // Push into our 'open' stack
        openTokens.push(t);
      } else  if (t.type === 'close') {
        const index = openTokens.findIndex(token => token.el === t.el);
        if (index !== -1) {
          // Remove from the stack if the element is closed
          openTokens.splice(index, 1);
        }
      }
    }
    
    if (openTokens.length === 0)
      throw new Error(`Invalid offset: ${charOffset}`);

    const parent = openTokens[openTokens.length - 1];
    const path = getXPointerRecursive(parent.el);
    
    return`${path.join('')}::${charOffset - parent.position}`;
  }

  return {
    findByTagName,
    findLastClosed,
    findNext,
    findPrevious,
    getAnnotations,
    getBoundaries,
    getChildren,
    getParents,
    getParentsAtPos,
    getText,
    getXPointer,
    toJSON,
    toText
  }

}