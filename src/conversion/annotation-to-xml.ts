import { doc } from '../dom';
import type { StandoffAnnotation } from '../types';

/** XML IDs are not allowed to start with a number! **/
const startsWithNumber = (str: string) =>
  /^\\d/.test(str);

/** Recogito convention: prefix UUIDs with `uid-` (because, numbers...) **/
const isUUID = (str: string) =>
  /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(str);

export const annotation2xml = (
  annotation: StandoffAnnotation, 
  namespace = 'http://www.tei-c.org/ns/1.0',
  ceteiceanPrefix?: string
) => {
  // Shorthand
  const _createElement = (tagName: string) => ceteiceanPrefix 
      ? doc.createElementNS(namespace, `${ceteiceanPrefix}${tagName}`)
      : doc.createElementNS(namespace, tagName);

  const annotationEl = _createElement('annotation');

  // XML-safe ID
  const shouldPrefix = startsWithNumber(annotation.id) || isUUID(annotation.id);
  const xmlId = shouldPrefix ? `uid-${annotation.id}` : annotation.id;
  annotationEl.setAttribute('xml:id', xmlId);

  // Target
  const { start, end } = annotation;
  const target = `${start.path}::${start.offset} ${end.path}::${end.offset}`;
  annotationEl.setAttribute('target', target);

  // Tags
  (annotation.tags || []).forEach(tag => {
    const rsEl = _createElement('rs')
    rsEl.setAttribute('ana', tag);
    annotationEl.appendChild(rsEl);
  });

  return annotationEl;
}
