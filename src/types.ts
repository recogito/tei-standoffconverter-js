export interface Element {

  attributes: NamedNodeMap;

  childNodes: NodeListOf<ChildNode>;

  namespaceURI: string | null;

  nodeType: number;

  parentElement: Element | null;

  previousSibling: Node | null;

  tagName: string;

  textContent: string | null;

  appendChild(child: Node): Node;

  getAttribute(name: string): string | null;

  hasAttribute(name: string): boolean;

  setAttribute(name: string, value: string): void;

}

export interface MarkupToken {

  position: number;

  type: MarkupTokenType;

  el: Element |null;

  depth: number | null;

  text?: string | null;

  serializeAs?: SerializationMode;

  standOffId?: string;

}

export type MarkupTokenType = 'open' | 'close' | 'text' | 'empty';

export type SerializationMode = 'inline' | 'standoff';