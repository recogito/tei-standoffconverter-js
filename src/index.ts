import { createStandoffTable } from './standoff';
import { xml2standoff } from './conversion';

const parseXML = (arg: Element | string) => {
  const standoff = xml2standoff(arg);
  return createStandoffTable(standoff);
}

export default { 
  parseXML
};