import { Node, DOMParser as NodeDOMParser } from '@xmldom/xmldom';
import xpath from 'xpath';

let doc: Document;

let Constants: { 

  ELEMENT_NODE: number; 

  TEXT_NODE: number;

  NUMBER_TYPE: number;

};

let parseXML: (xml: string) => Element;

let serializeXML: (element: Element) => string;

let evaluateXPath: (xpath: string, el: Element) => any;

if (typeof document !== 'undefined') {
  // Browser
  doc = document;

  Constants = {
    ELEMENT_NODE: Node.ELEMENT_NODE,
    TEXT_NODE: Node.TEXT_NODE,
    NUMBER_TYPE: XPathResult.NUMBER_TYPE
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

  evaluateXPath = (expression: string, el: Element) => {
    return document.evaluate(
      expression, 
      el, 
      null, 
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  } 
} else {
  // NodeJS
  doc = new NodeDOMParser().parseFromString('<root />', 'text/xml') as unknown as Document;

  Constants = {
    ELEMENT_NODE: Node.ELEMENT_NODE,
    TEXT_NODE: Node.TEXT_NODE,
    NUMBER_TYPE: 1
  };

  parseXML = (xml: string) => {
    const parser = new NodeDOMParser();
    return parser.parseFromString(xml, 'text/xml').documentElement as unknown as Element;
  }

  serializeXML = (element: Element) => element.toString();

  evaluateXPath = (expression: string, el: Element) => {
    return xpath.select1(expression, el);
  }

}

export { doc, Constants, evaluateXPath, parseXML, serializeXML };
