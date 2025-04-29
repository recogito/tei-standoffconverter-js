export interface TableRow {

  position: number;

  row_type: RowType;

  el: Element | null;

  depth: number | null;

  text: string | null;

}

export type RowType = 'open' | 'close' | 'text' | 'empty';

export interface StandoffElement {

  el: Element;

  begin: number;

  end: number | null;

  depth: number;

}

export interface StandoffJSON {

  tag: string;

  attrib: Record<string, string>;

  begin: number;

  end: number;

  depth: number;

}
