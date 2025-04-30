let _doc: Document;
let _Constants: { ELEMENT_NODE: number; TEXT_NODE: number };

if (typeof document !== 'undefined') {
  // Browser
  _doc = document;
  _Constants = {
    ELEMENT_NODE: Node.ELEMENT_NODE,
    TEXT_NODE: Node.TEXT_NODE
  };
} else {
  // NodeJS
  const { JSDOM } = require('jsdom');
  const jsdom = new JSDOM('<!DOCTYPE html><root></root>', {
    contentType: 'text/xml',
  });

  _doc = jsdom.window.document;
  _Constants = {
    ELEMENT_NODE: jsdom.window.Node.ELEMENT_NODE,
    TEXT_NODE: jsdom.window.Node.TEXT_NODE,
  };
}

export { _doc as doc };
export { _Constants as Constants };
