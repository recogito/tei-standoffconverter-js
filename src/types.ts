export interface StandoffTableRow {

  position: number;

  row_type: StandoffTableRowType;

  el: Element | null;

  depth: number | null;

  text: string | null;

}

export type StandoffTableRowType = 'open' | 'close' | 'text' | 'empty';

export interface PositionTable {

  rows: StandoffTableRow[];

  getContextAtPos: (position: number) => Element[];

  getText: () => string;

  insertClose: (position: number, el: Element, depth: number) => void;

  insertEmpty: (position: number, el: Element, depth: number, insertIndexAtPos?: number) => void;

  insertOpen: (position: number, el: Element, depth: number) => void;

  setEl: (el: Element, props: Partial<StandoffTableRow>) => void;

}

export interface StandoffTable {

  rows: StandoffTableRow[];

  addInlineElement: (
    begin: number,
    end: number,
    tag: string,
    depth?: number | null,
    attrib?: Record<string, string> | null,
    insertIndexAtPos?: number
  ) => void;

  getXPointer: (charOffset: number) => string;
  
}
