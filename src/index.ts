import { StandoffTable } from './core/standoff-table';
import { standoff2xml, xml2standoff } from './conversion';

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