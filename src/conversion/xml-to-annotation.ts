import { getChildren } from '../dom';
import type { MarkupToken, StandoffAnnotation } from '../types';

const createTaxonomies = (tokens: MarkupToken[]) => {
  const categories = tokens.filter(t => t.type === 'open' && t.el?.tagName === 'category');

  const getTerm = (id: string): { id: string, desc: string } => {
    const cat = categories.find(t => t.el.getAttribute('xml:id') === id);
    if (!cat) return null;

    const descEl = getChildren(cat.el, 'catDesc')[0];
    if (!descEl) return null;

    const desc = descEl.textContent;
    return desc ? { id, desc } : null;
  }

  return {
    getTerm
  }
}

export const xml2annotation = (annotationEl: Element, tokens: MarkupToken[]): StandoffAnnotation => {
  const xmlId = annotationEl.getAttribute('xml:id');
  const id = xmlId.startsWith('uid-') ? xmlId.substring(4) : xmlId;

  const taxonomies = createTaxonomies(tokens);

  const target = annotationEl.getAttribute('target');
  if (!target)
    throw new Error('Missing annotation target');

  const [start, end] = target.split(' ');
  if (!start || !end)
    throw new Error(`Invalid annotation target: ${target}`);

  const [startPath, startOffsetStr] = start.split('::');
  const [endPath, endOffsetStr] = end.split('::');

  const startOffset = parseInt(startOffsetStr);
  const endOffset = parseInt(endOffsetStr);

  if (isNaN(startOffset) || isNaN(endOffset))
    throw new Error(`Invalid annotation target: ${target}`);

  const rs = getChildren(annotationEl, 'rs');

  const tags = rs.map(el => {
    const ana = el.getAttribute('ana');

    const id = ana.startsWith('#') ? ana.substring(1) : ana;
    const term = taxonomies.getTerm(id);
    return term ? { label: term.desc, id: term.id } : { label: ana }
  }).filter(t => t.label);

  return {
    id,
    start: { path: startPath, offset: startOffset },
    end: { path: endPath, offset: endOffset },
    tags
  }

}
