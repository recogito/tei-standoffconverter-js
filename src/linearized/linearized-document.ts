import { doc, evaluateXPath, serializeXML } from '../dom';
import { annotation2xml, linearized2xml, xml2annotation, xml2linearized } from '../conversion';
import type { MarkupToken, StandoffAnnotation } from '../types';
import { createModifyOperations, createQueryOperations } from './operations';

export const createLinearizedTable = (el: Element, tokens: MarkupToken[], namespace = 'http://www.tei-c.org/ns/1.0') => {

  const isCETEIcean = Boolean((el as any).dataset?.origname);

  const query = createQueryOperations(tokens);

  const modify = createModifyOperations(tokens);

  const _createElement = (tag: string, attrib?: Record<string, string>): Element => {
    const el = isCETEIcean 
      ? doc.createElementNS(namespace, `tei-${tag.toLowerCase()}`)
      : doc.createElementNS(namespace, tag);
    
    if (attrib) {
      Object.entries(attrib).forEach(([key, value]) => {
        if (key === 'xml:id') {
          el.id = value;
          el.setAttribute('xml:id', value);
          el.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'id', value);
        } else {
          el.setAttribute(key, value);
        }
      });
    }

    if (isCETEIcean)
      el.setAttribute('data-origname', tag);
    
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

    const normalized = path.replace(/\/([^[/]+)/g, (_, p1) => {
      return isCETEIcean ? '/tei-' + p1.toLowerCase() : '/' + p1;
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

  const xml = () => {
    const [el, _] = linearized2xml(tokens);
    return el;
  }

  /** Recogito-specific utility functions */
  const annotations = (standOffId?: string) =>
    query.getAnnotations(standOffId)
      .filter(t => t.type === 'open' && t.el).map(t => t.el)
      .map(xml2annotation);

  const addStandOff = (id: string) => {
    // Create new elements
    const standOffEl = _createElement('standOff', { 'xml:id': id });
    const listAnnotationEl = _createElement('listAnnotation');
    standOffEl.appendChild(listAnnotationEl);

    const findLastClosed = (tagName: string) => {
      const closed = query.findByTagName(tagName).filter(t => t.type === 'close');
      return (closed.length === 0) ? undefined : closed[closed.length - 1];
    }
  
    const standoffClosed = findLastClosed('standOff');
    if (standoffClosed) {
      // Insert after last standOff element
      modify.insertOpen(standoffClosed.position, standOffEl, standoffClosed.depth);
      modify.insertOpen(standoffClosed.position, listAnnotationEl, standoffClosed.depth + 1);
      modify.insertClose(standoffClosed.position, listAnnotationEl, standoffClosed.depth + 1);
      modify.insertClose(standoffClosed.position, standOffEl, standoffClosed.depth);
    } else {
      const headerClosed = findLastClosed('teiHeader');
      if (headerClosed) {
        // Insert after header
        const insertAt = tokens.indexOf(headerClosed) + 1; 

        modify.insertOpen(headerClosed.position, standOffEl, headerClosed.depth, insertAt);
        modify.insertOpen(headerClosed.position, listAnnotationEl, headerClosed.depth + 1, insertAt + 1);
        modify.insertClose(headerClosed.position, listAnnotationEl, headerClosed.depth + 1, insertAt + 2);
        modify.insertClose(headerClosed.position, standOffEl, headerClosed.depth, insertAt + 3);
      }
    }
  }

  const addAnnotation = (standOffId: string, annotation: StandoffAnnotation) => {
    const standOffClosed = query
      .findByTagName('standOff')
      .filter(t => t.type === 'close')
      .filter(t => t.el?.getAttribute('xml:id') === standOffId)[0];

    if (!standOffClosed) 
      throw new Error(`No standOff element with id ${standOffId}`);

    const annotationListToken = query.findPrevious(tokens.indexOf(standOffClosed), 'listAnnotation');
    if (!annotationListToken)
      throw new Error(`No annotation list found in standOff ${standOffId}`);

    // Convert annotation
    const annotationEl =  
      annotation2xml(annotation, namespace, isCETEIcean ? 'tei-' : undefined); 

    const annotationTokens = xml2linearized(annotationEl);

    // Insert the annotation tokens
    const insertPosition = annotationListToken.position;
    const insertDepth = annotationListToken.depth! + 1;
  
    let currentPosition = insertPosition;
    for (const token of annotationTokens) {
      token.position = currentPosition;
      token.depth = insertDepth;

      // For text tokens, advance the position counter
      if (token.type === 'text' && token.text)
        currentPosition += token.text.length;

      // Insert the token
      tokens.splice(tokens.indexOf(annotationListToken), 0, token);
    }

    // Update positions of all tokens after the insertion
    const insertedLength = currentPosition - insertPosition;
    if (insertedLength > 0) {
      for (let i = tokens.indexOf(standOffClosed) + annotationTokens.length; i < tokens.length; i++) {
        tokens[i].position += insertedLength;
      }
    }
  }

  const xmlString = () => serializeXML(xml());

  return {
    tokens: tokens,
    addAnnotation,
    addInline,
    addStandOff,
    annotations,
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