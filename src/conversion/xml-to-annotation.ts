import { getChildren } from '../dom';
import type { StandoffAnnotation } from '../types';

export const xml2annotation = (el: Element): StandoffAnnotation => {

  const xmlId = el.getAttribute('xml:id');
  const id = xmlId.startsWith('uid-') ? xmlId.substring(4) : xmlId;

  const target = el.getAttribute('target');
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

  const rs = getChildren(el, 'rs');

  return {
    id,
    start: { path: startPath, offset: startOffset },
    end: { path: endPath, offset: endOffset },
    tags: rs.map(el => el.getAttribute('ana')).filter(Boolean)
  }

}
