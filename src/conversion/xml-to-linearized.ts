import { Constants } from '../dom';
import type { Element, MarkupToken, MarkupTokenType } from '../types';

interface FlatRecord {

  type: MarkupTokenType;
  
  el: Element;

  depth: number;

  text: string | null;

}

/**
 * Core XML traversal logic. Walks through the XML tree
 * recursively, records tag start/text/end.
 */
const flattenTree = (el: Element): FlatRecord[] => {
  const result: FlatRecord[] = [];
  
  const processNode = (node: Node, depth: number = 0): void => {
    if (node.nodeType === Constants.ELEMENT_NODE) {
      result.push({
        type: 'open',
        el: node as unknown as Element,
        depth,
        text: null
      });
      
      // Traverse this node's children
      for (let i = 0; i < node.childNodes.length; i++) {
        processNode(node.childNodes[i], depth + 1);
      }
      
      result.push({
        type: 'close',
        el: node as unknown as Element,
        depth,
        text: null
      });
    } else if (node.nodeType === Constants.TEXT_NODE) {
      result.push({
        type: 'text',
        el: null,
        depth: null,
        text: node.nodeValue
      });
    }
  }
  
  processNode(el as unknown as Node);

  return result;
}

export const xml2linearized = (el: Element): MarkupToken[] => {
  const flattened = flattenTree(el);

  const standoff: MarkupToken[] = []; 

  let position = 0;
  
  // Accumulate position offsets
  for (const item of flattened) {
    const { type, el, depth, text } = item;
    
    standoff.push({
      position,
      type,
      el,
      depth,
      text
    });
    
    if (type === 'text' && text)
      position += text.length;
  }
  
  return standoff;
}