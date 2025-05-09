import { doc } from '../dom';
import type { MarkupToken } from '../types';

export const createDOMUtils = (el: Element, tokens: MarkupToken[], namespace: string) => {

  const isCETEIcean = Boolean((el as any).dataset?.origname);
  
  const createElement = (tag: string, attrib?: Record<string, string>): Element => {
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
  
  const addTaxonomy = (id: string) => {

  }

  const upsertTaxonomyCategory = (taxonomyId: string, categoryId: string, categoryLabel: string) => {

  } 

  return {
    isCETEIcean,
    addTaxonomy,
    createElement,
    upsertTaxonomyCategory
  }

}

