import { Node, DOMParser as NodeDOMParser } from '@xmldom/xmldom';
import xpath from 'xpath';
import type { Element as CrossplatformElement } from './types';

let doc: Document;

let Constants: { 

  ELEMENT_NODE: number; 

  TEXT_NODE: number;

  NUMBER_TYPE: number;

};

let parseXML: (xml: string) => CrossplatformElement;

let serializeXML: (element: CrossplatformElement) => string;

let evaluateXPath: (xpath: string, el: CrossplatformElement) => any;

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
    return doc.documentElement as CrossplatformElement;
  }

  serializeXML = (element: CrossplatformElement) => {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(element as Element);
  }

  evaluateXPath = (expression: string, el: CrossplatformElement) => {
    return document.evaluate(
      expression, 
      el as Element, 
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
    return parser.parseFromString(xml, 'text/xml').documentElement as unknown as CrossplatformElement;
  }

  serializeXML = (element: CrossplatformElement) => element.toString();

  evaluateXPath = (expression: string, el: CrossplatformElement) => {
    console.log(expression);
    return xpath.select1(expression, el as Element);
  }

}

export { doc, Constants, evaluateXPath, parseXML, serializeXML };
