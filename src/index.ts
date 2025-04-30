import { createStandoffTable } from './standoff';
import { standoff2xml, xml2standoff } from './conversion';

const parseXML = (arg: Element | string) => {
  const standoff = xml2standoff(arg);
  return createStandoffTable(standoff);
}

const serializeStandoff = (table: ReturnType<typeof createStandoffTable>) => {
  const [el, _] = standoff2xml(table.rows);
  return el;
}

export default { 
  parseXML, 
  serializeStandoff 
};