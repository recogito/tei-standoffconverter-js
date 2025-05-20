import type { StandoffAnnotation } from './types';

const ALLOWED_TAGS = ['placeName', 'persName'];

export const isInlinable = (annotation: StandoffAnnotation, allowedTags = ALLOWED_TAGS) => {
  if (annotation.tags.length !== 1) return false;

  const tag = annotation.tags[0];
  return allowedTags.includes(tag.label) || allowedTags.includes(tag.id);
}

export const getInlinableTagName = (annotation: StandoffAnnotation, allowedTags = ALLOWED_TAGS) =>
  [annotation.tags[0].id, annotation.tags[0].label].filter(str => allowedTags.includes(str))[0];