export interface MarkupToken {

  position: number;

  type: MarkupTokenType;

  el: Element |null;

  depth: number | null;

  text?: string | null;

}

export type MarkupTokenType = 'open' | 'close' | 'text' | 'empty';

export type SerializationMode = 'inline' | 'standoff';

export type StandoffAnnotation = {

  id: string;

  created?: string;

  creator?: string;

  note?: string;

  tags: Tag[];

  updated?: string;

  updatedBy?: string;

  start: { path: string, offset: number };

  end: { path: string, offset: number };

}

export interface Tag {

  label: string;

  id?: string;

}