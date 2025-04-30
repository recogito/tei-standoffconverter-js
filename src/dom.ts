let doc: Document;

let Constants: { ELEMENT_NODE: number; TEXT_NODE: number };

let parseXML: (xml: string) => Element;
let serializeXML: (element: Element) => string;

if (typeof document !== 'undefined') {
  // Browser
  doc = document;

  Constants = {
    ELEMENT_NODE: Node.ELEMENT_NODE,
    TEXT_NODE: Node.TEXT_NODE
  };

  parseXML = (xml: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    return doc.documentElement;
  }

  serializeXML = (element: Element) => {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(element);
  }
} else {
  // NodeJS
  const { JSDOM } = require('jsdom');

  const jsdom = new JSDOM('<!DOCTYPE html><html></html>', {
    contentType: 'text/xml',
  });

  doc = jsdom.window.document;

  Constants = {
    ELEMENT_NODE: jsdom.window.Node.ELEMENT_NODE,
    TEXT_NODE: jsdom.window.Node.TEXT_NODE,
  };

  parseXML = (xml: string) => {
    const dom = new JSDOM(xml, { contentType: 'text/xml' });
    return dom.window.document.documentElement;
  }

  serializeXML = (element: Element, options?: { pretty?: boolean, declaration?: boolean }) => {
    const serializer = new jsdom.window.XMLSerializer();
    return serializer.serializeToString(element);
  }
}

export { doc, Constants, parseXML, serializeXML };
