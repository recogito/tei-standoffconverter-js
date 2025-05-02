import { createLinearizedTable } from './linearized';
import { xml2linearized } from './conversion';

export const parseXML = (arg: Element | string) => {
  const linearized = xml2linearized(arg);
  return createLinearizedTable(linearized);
}