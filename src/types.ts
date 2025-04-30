export interface StandoffTableRow {

  position: number;

  row_type: StandoffTableRowType;

  el: Element | null;

  depth: number | null;

  text?: string | null;

}

export type StandoffTableRowType = 'open' | 'close' | 'text' | 'empty';