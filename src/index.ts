import { createStandoffTable } from './standoff';
import { xml2standoff } from './conversion';

export const parseXML = (arg: Element | string) => {
  const standoff = xml2standoff(arg);
  return createStandoffTable(standoff);
}