import { doc } from '../dom';

export const createDOMUtils = (el: Element, namespace: string) => {

  const isCETEIcean = Boolean((el as any).dataset?.origname);
  
  const createElement = (tag: string, attrib?: Record<string, string>): Element => {
    const el = isCETEIcean 
      ? doc.createElementNS(namespace, `tei-${tag.toLowerCase()}`)
      : doc.createElementNS(namespace, tag);
    
    if (attrib) {
      Object.entries(attrib).forEach(([key, value]) => {
        if (key === 'xml:id') {
          if (isCETEIcean)
            el.id = value;

          el.setAttribute('xml:id', value);
        } else {
          el.setAttribute(key, value);
        }
      });
    }

    if (isCETEIcean)
      el.setAttribute('data-origname', tag);
    
    return el as Element;
  }

  const createText = (text: string) => doc.createTextNode(text);

  return {
    isCETEIcean,
    createElement,
    createText
  }

}

