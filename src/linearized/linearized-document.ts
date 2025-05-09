import { v4 as uuidv4 } from 'uuid';
import { evaluateXPath, serializeXML } from '../dom';
import { annotation2xml, linearized2xml, xml2annotation, xml2linearized } from '../conversion';
import type { MarkupToken, StandoffAnnotation, Tag } from '../types';
import { createModifyOperations, createQueryOperations } from './operations';
import { createDOMUtils } from './dom-utils';

export const createLinearizedTable = (el: Element, tokens: MarkupToken[], namespace = 'http://www.tei-c.org/ns/1.0') => {

  const dom = createDOMUtils(el, namespace);
  const query = createQueryOperations(tokens);
  const modify = createModifyOperations(tokens);

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
      // const text = query.getText(b, e);
      // if (!text.trim()) return;

      // Get parent context
      const parents = query.getParents(b, e, d);
      const newDepth = d ?? parents.length;
  
      // Create new element
      const newEl = dom.createElement(tag, attrib);

      // Insert the new element
      if (b === e) {
        modify.insertEmpty(b, newEl, newDepth);
      } else {
        modify.insertOpen(b, newEl, newDepth);
        modify.insertClose(e, newEl, newDepth);
      }

      // Update child depths
      const children = query.getChildren(b, e, newDepth);
      for (const child of children) {
        const childRow = tokens.find(row => row.el === child);
        if (childRow)
          modify.updateToken(child, { depth: childRow.depth + 1 });
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
      return dom.isCETEIcean ? '/tei-' + p1.toLowerCase() : '/' + p1;
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
      .map(annotationEl => xml2annotation(annotationEl, tokens));

  const addStandOff = (id: string) => {
    // Create new elements
    const standOffEl = dom.createElement('standOff', { 'xml:id': id });
    const listAnnotationEl = dom.createElement('listAnnotation');
    standOffEl.appendChild(listAnnotationEl);

    const standoffClosed = query.findLastClosed('standOff');
    if (standoffClosed) {
      // Insert after last standOff element
      const insertAt = tokens.indexOf(standoffClosed) + 1;
      modify.insertOpen(standoffClosed.position, standOffEl, standoffClosed.depth, insertAt);
      modify.insertOpen(standoffClosed.position, listAnnotationEl, standoffClosed.depth + 1, insertAt + 1);
      modify.insertClose(standoffClosed.position, listAnnotationEl, standoffClosed.depth + 1, insertAt + 2);
      modify.insertClose(standoffClosed.position, standOffEl, standoffClosed.depth, insertAt + 3);
    } else {
      const headerClosed = query.findLastClosed('teiHeader');
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

  // Note: taxonomy is a child of TEI > teiHeader > encodingDesc > classDecl
  const addTaxonomy = (id: string) => {
    // Don't add taxonomy if it exists already
    const existing = tokens.find(t => 
      t.el?.tagName === 'taxonomy' && 
      t.el?.getAttribute('xml:id') === id);

    if (existing) return;

    // DOM manipulation helpers
    const getOpen = (tagName: string, start = 0) =>
      tokens.slice(start).find(t => t.el?.tagName === tagName && t.type === 'open');

    const getClose = (tagName: string, start = 0) =>
      tokens.slice(start).find(t => t.el?.tagName === tagName && t.type === 'close');

    const hasTag = (tagName: string, start = 0) =>
      tokens.slice(start).find(t => t.el?.tagName === tagName);

    const createTag = (offset: number) => (token: MarkupToken, tagName: string, attr: Record<string, string> = {}) => {
      const tagEl = dom.createElement(tagName, attr);

      const insertAt = tokens.indexOf(token) + offset;

      modify.insertOpen(token.position, tagEl, token.depth + 1, insertAt);
      modify.insertClose(token.position, tagEl, token.depth + 1, insertAt + 1);
    }

    const createTagBefore = createTag(0);
    const createTagAfter = createTag(1);

    // Insert teiHeader if it doesn't exist
    if (!hasTag('teiHeader'))
      createTagAfter(getOpen('TEI'), 'teiHeader');

    const teiHeader = getOpen('teiHeader');

    // Insert encodingDesc if it doesn't exist
    if (!hasTag('encodingDesc', tokens.indexOf(teiHeader)))
      createTagAfter(teiHeader, 'encodingDesc');

    const encodingDesc = getOpen('encodingDesc', tokens.indexOf(teiHeader));

    // Insert classDecl if it doesn't exist
    if (!hasTag('classDecl', tokens.indexOf(encodingDesc))) {
      createTagAfter(encodingDesc, 'classDecl');
    }

    const classDecl = getClose('classDecl', tokens.indexOf(encodingDesc));
    createTagBefore(classDecl, 'taxonomy', { 'xml:id': id });
  }

  const insertTokens = (toInsert: MarkupToken[], afterToken: MarkupToken) => {
    const insertPos = afterToken.position;
    const insertDepth = afterToken.depth! + 1;

    let currentPosition = insertPos;

    for (const token of toInsert) {
      token.position = currentPosition;
      token.depth = insertDepth;

      // For text tokens, advance the position counter
      if (token.type === 'text' && token.text)
        currentPosition += token.text.length;

      // Insert the token
      tokens.splice(tokens.indexOf(afterToken), 0, token);
    }

    // Update positions of all tokens after the insertion
    const insertedLength = currentPosition - insertPos;
    if (insertedLength > 0) {
      for (let i = tokens.indexOf(afterToken) + toInsert.length; i < tokens.length; i++) {
        tokens[i].position += insertedLength;
      }
    }
  }

  const addTaxonomyCategory = (taxonomyId: string, categoryId: string, categoryLabel: string) => {
    // Don't insert if the term already exists in the given taxonomy
    const existing = tokens.find(t => 
      t.el?.tagName === 'category' && 
      t.el?.getAttribute('xml:id') === categoryId &&
      t.el.parentElement?.getAttribute('xml:id') === taxonomyId);

    if (existing) return;

    const taxonomy = query
      .findByTagName('taxonomy')
      .filter(t => t.type === 'close')
      .filter(t => t.el?.getAttribute('xml:id') === taxonomyId);

    if (!taxonomy && taxonomy.length !== 1)
      throw new Error(`No taxonomy element with id ${taxonomyId}`);

    // Create DOM elements
    const categoryEl = dom.createElement('category', { 'xml:id': categoryId });
    const catDescEl = dom.createElement('catDesc');
    catDescEl.appendChild(dom.createText(categoryLabel));
    categoryEl.appendChild(catDescEl);

    // Insert tokens
    const categoryTokens = xml2linearized(categoryEl);
    insertTokens(categoryTokens, taxonomy[0]);
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

    // Insert taxonomy terms, if necessary
    const taxonomyTerms = annotation.tags.filter(t => t.id);
    if (taxonomyTerms.length > 0) {
      const taxonomyId = `taxonomy-${standOffId}`;

      addTaxonomy(taxonomyId); // Method skips automatically if the taxonomy exists

      taxonomyTerms.forEach(t => addTaxonomyCategory(taxonomyId, t.id!, t.label));
    }

    // Convert annotation
    const annotationEl =  
      annotation2xml(annotation, namespace, dom.isCETEIcean ? 'tei-' : undefined); 

    const annotationTokens = xml2linearized(annotationEl);
    insertTokens(annotationTokens, annotationListToken);
  }

  // Convenience method
  const addStandOffTag = (standOffId: string, begin: number, end: number, tag: string | Tag) => {
    const [startPath, startOffset] = query.getXPointer(begin).split('::');
    const [endPath, endOffset] = query.getXPointer(end).split('::');

    const tagObj: Tag = typeof tag === 'string' ? {label: tag } : tag;

    const annotation: StandoffAnnotation = {
      id: uuidv4(),
      start: {
        path: startPath,
        offset: parseInt(startOffset)
      },
      end: {
        path: endPath, 
        offset: parseInt(endOffset)
      },
      tags: [tagObj]
    }

    addAnnotation(standOffId, annotation);
  }

  const xmlString = () => serializeXML(xml());

  return {
    tokens: tokens,
    addAnnotation,
    addInline,
    addStandOff,
    addStandOffTag,
    addTaxonomy,
    addTaxonomyCategory,
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