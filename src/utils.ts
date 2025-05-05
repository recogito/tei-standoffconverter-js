import { Constants } from './dom';
import type { Element } from './types';

export const getChildren = (node: Node): Element[] => {
  const children: Element[] = [];
  let child = node.firstChild;

  while (child) {
    if (child.nodeType === Constants.ELEMENT_NODE) {
      children.push(child as unknown as Element);
    }
    child = child.nextSibling;
  }

  return children;
}

export const getFirstElementChild = (node: Node): Element | null => {
  let child = node.firstChild;

  while (child) {
    if (child.nodeType === Constants.ELEMENT_NODE) {
      return child as unknown as Element;
    }
    child = child.nextSibling;
  }

  return null;
}