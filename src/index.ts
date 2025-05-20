import { parseXML as _parseXML } from './dom';
import { createLinearizedTable } from './linearized';
import { xml2linearized } from './conversion';

export const parseXML = (arg: Element | string) => {
  const el = typeof arg === 'string' ? _parseXML(arg) : arg;
  const linearized = xml2linearized(el);
  return createLinearizedTable(el, linearized);
}

export { isInlinable } from './utils';

export * from './types';