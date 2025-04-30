/** Cross-platform constants **/
export const Constants = (() => {
  if (typeof window === 'undefined') {
    // Node.js
    const { JSDOM } = require('jsdom');
    const { Node } = new JSDOM().window;
    return {
      ELEMENT_NODE: Node.ELEMENT_NODE,
      TEXT_NODE: Node.TEXT_NODE
    };

  } else {
    // Browser
    return {
      ELEMENT_NODE: Node.ELEMENT_NODE,
      TEXT_NODE: Node.TEXT_NODE
    };
  }
})();