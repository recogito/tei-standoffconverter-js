import { StandoffTable } from './standoff';
import { standoff2xml, xml2standoff } from './util';

const parseTEI = (element: Element) => {
  const standoff = xml2standoff(element);
  return StandoffTable(standoff);
}

const serializeStandoff = (table: ReturnType<typeof StandoffTable>) => {
  const [el, _] = standoff2xml(table.rows);
  return el;
}

export default { 
  parseTEI, 
  serializeStandoff 
};