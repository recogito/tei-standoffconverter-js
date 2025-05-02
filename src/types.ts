export interface MarkupToken {

  position: number;

  row_type: MarkupTokenType;

  el: Element |null;

  depth: number | null;

  text?: string | null;

  serializeAs?: SerializationMode;

  standOffId?: string;

}

export type MarkupTokenType = 'open' | 'close' | 'text' | 'empty';

export type SerializationMode = 'inline' | 'standoff';