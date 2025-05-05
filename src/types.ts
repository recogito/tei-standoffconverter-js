export interface MarkupToken {

  position: number;

  type: MarkupTokenType;

  el: Element |null;

  depth: number | null;

  text?: string | null;

  serializeAs?: SerializationMode;

  standOffId?: string;

}

export type MarkupTokenType = 'open' | 'close' | 'text' | 'empty';

export type SerializationMode = 'inline' | 'standoff';

export type StandoffAnnotation = {

  id: string;

  created?: string;

  creator?: string;

  note?: string;

  tags: string[];

  updated?: string;

  updatedBy?: string;

  start: { path: string, offset: number };

  end: { path: string, offset: number };

}