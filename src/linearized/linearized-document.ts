import { doc, evaluateXPath, serializeXML } from '../dom';
import { linearized2xml } from '../conversion';
import type { MarkupToken } from '../types';
import { createModifyOperations, createQueryOperations } from './operations';

export const createLinearizedTable = (el: Element, tokens: MarkupToken[], namespace = 'http://www.tei-c.org/ns/1.0') => {

  const query = createQueryOperations(tokens);

  const modify = createModifyOperations(tokens);

  const _createElement = (tag: string, attrib?: Record<string, string>): Element => {
    const el = doc.createElementNS(namespace, tag);
    
    if (attrib) {
      Object.entries(attrib).forEach(([key, value]) => {
        if (key === 'xml:id')
          el.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'id', value);
        else
          el.setAttribute(key, value);
      });
    }
    
    return el as Element;
  }

  const removeInline = (
    el: Element,
    removeContents = true
  ) => {
    const matchingTokens = tokens.filter(t => t.el === el);

    const openToken = matchingTokens.find(t => t.type === 'open');
    const closeToken = matchingTokens.find(t => t.type === 'close');
    const emptyToken = matchingTokens.find(t => t.type === 'empty');

    if (emptyToken) {
      const emptyIndex = tokens.indexOf(emptyToken);
      tokens.splice(emptyIndex, 1);
    } else if (openToken && closeToken) {
      const openIndex = tokens.indexOf(openToken);
      const closeIndex = tokens.indexOf(closeToken);

      if (removeContents) {
        // Adjust position offsets after the clip!
        let removedChars = 0;
        for (let i = openIndex; i <= closeIndex; i++) {
          const token = tokens[i];
          if (token.type === 'text' && token.text)
            removedChars += token.text.length;
        }

        // Remove everything from open to close, inclusive
        tokens.splice(openIndex, closeIndex - openIndex + 1);

        // Update positions after the splice
        for (let i = openIndex; i < tokens.length; i++) {
          tokens[i].position -= removedChars;
        }
      } else {
        // Remove just the open and close tokens and keep the rest
        tokens.splice(closeIndex, 1);
        tokens.splice(openIndex, 1);
        
        // Update depths of any child elements that remain
        const childTokens = tokens.filter(t => {
          const index = tokens.indexOf(t);
          return index > openIndex && index < closeIndex - 1 && t.depth && t.depth > openToken.depth;
        });
        
        for (const childToken of childTokens) {
          modify.updateToken(childToken.el!, { depth: (childToken.depth! - 1) });
        }
      }
    }
  }

  const addInline = (
    begin: number,
    end: number,
    tag: string,
    attrib: Record<string, string> = {}
  ) => {
    // Existing tag boundaries between begin and end
    const boundaries = query.getBoundaries(begin, end);

    const addSegment = (b: number, e: number, d?: number) => {
      // Get parent context
      const parents = query.getParents(b, e, d);
      const newDepth = d ?? parents.length;
  
      // Update child depths
      const children = query.getChildren(b, e, newDepth);
      for (const child of children) {
        const childRow = tokens.find(row => row.el === child);
        if (childRow)
          modify.updateToken(child, { depth: childRow.depth + 1 });
      }

      // Create new element
      const newEl = _createElement(tag, attrib);
  
      // Insert the new element
      if (b === e) {
        modify.insertEmpty(b, newEl, newDepth);
      } else {
        modify.insertOpen(b, newEl, newDepth);
        modify.insertClose(e, newEl, newDepth);
      }
    }

    if (boundaries.length <= 2) { // Just the begin and end positions
      addSegment(begin, end);
    } else {
      // Create segments based on boundaries
      const segments: { start: number; end: number }[] = [];

      for (let i = 0; i < boundaries.length - 1; i++) {
        segments.push({ start: boundaries[i], end: boundaries[i + 1] });
      }

      segments.map(s => addSegment(s.start, s.end));
    }
  }

  const getCharacterOffset = (xpath: string) => {
    const [path, offsetStr] = xpath.split('::');
    if (!path || !offsetStr)
      throw new Error(`Invalid XPath format: ${xpath}`);

    const offset = parseInt(offsetStr);
    if (isNaN(offset))
      throw new Error(`Invalid XPath offset: ${xpath}`);

    const isCETEIcean = Boolean((el as any).dataset?.origname);

    const normalized = path.replace(/\/([^[/]+)/g, (_, p1) => {
      return isCETEIcean ? '/tei-' + p1 : '/' + p1;
    }).replace(/xml:/g, '');

    const parentNode = evaluateXPath(normalized, el);

    const token = tokens.find(t => t.el === parentNode && t.type === 'open');
    return token ? token.position + offset : null;
  }

  const convertToInline = (el: Element) => {
    const tagName = (el as HTMLElement).dataset.origname || el.tagName;
    if (tagName.toLowerCase() !== 'annotation')
      throw new Error('Element is not an annotation');

    const target = el.getAttribute('target');
    if (!target)
      throw new Error('Cannot convert annotation - missing target attribute');

    const [start, end] = target.split(' ');
    if (!start || !end)
      throw new Error(`Invalid target: ${target}`);

    const startOffset = getCharacterOffset(start);
    const endOffset = getCharacterOffset(end);

    addInline(startOffset, endOffset, 'tei-note');
  }

  const annotations = () =>
    query.getAnnotations().filter(t => t.type === 'open' && t.el).map(t => t.el);

  const xml = () => {
    const [el, _] = linearized2xml(tokens);
    return el;
  }

  const xmlString = () => serializeXML(xml());

  return {
    tokens: tokens,
    annotations,
    addInline,
    convertToInline,
    getCharacterOffset,
    getXPointer: query.getXPointer,
    json: query.toJSON,
    removeInline,
    text: query.toText,
    xml,
    xmlString
  }

}