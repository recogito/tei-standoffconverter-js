import { parseHTML } from 'linkedom';
import { evaluateXPathToFirstNode as _evaluateXPathToFirstNode } from 'fontoxpath';
import { DOMParser as NodeDOMParser } from '@xmldom/xmldom';
import _xpath from 'xpath';

let doc: Document;

let Constants: { 

  ELEMENT_NODE: number; 

  TEXT_NODE: number;

  NUMBER_TYPE: number;

};

let parseXML: (xml: string) => Element;

let serializeXML: (element: Element) => string;

let evaluateXPathToFirstNode: (xpath: string, el: Element) => any;

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

  evaluateXPathToFirstNode = (xpath: string, el: Element) => doc.evaluate(
    xpath, 
    el, 
    null, 
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
} else {
  // NodeJS
  const dom = parseHTML('<!DOCTYPE html><html></html>');
  doc = dom.window.document;

  Constants = {
    ELEMENT_NODE: dom.window.Node.ELEMENT_NODE,
    TEXT_NODE: dom.window.Node.TEXT_NODE,
    NUMBER_TYPE: 1
  };

  // @ts-ignore
  parseXML = (xml: string) => {
    const parser = new NodeDOMParser();
    return parser.parseFromString(xml, 'text/xml').documentElement;
  }

  serializeXML = (element: Element) => {
    return element.toString();
    /*
    console.log('serializing', dom.window.XMLSerializer);
    const serializer = new dom.window.XMLSerializer();
    return serializer.serializeToString(element);*/
  }

  evaluateXPathToFirstNode = (xpath: string, el: Element) => {
    // TODO we can hopefully optimize/unify in the future. But for now:
    // - xmldom seems to lack the document.createElementNS method
    // - linkedom lacks XPath support
    // const serialized = serializeXML(el);

    // const parser = new NodeDOMParser();
    // const parsed = parser.parseFromString(serialized, 'text/xml');
    // return _evaluateXPathToFirstNode(xpath.toLowerCase(), el);

    return _xpath.select1(xpath, el);
  }

}

export { doc, Constants, evaluateXPathToFirstNode, parseXML, serializeXML };
