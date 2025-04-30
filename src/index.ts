import { createStandoffTable } from './standoff';
import { standoff2xml, xml2standoff } from './conversion';

const parseXML = (element: Element) => {
  const standoff = xml2standoff(element);
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