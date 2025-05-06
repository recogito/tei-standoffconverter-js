import { describe, it, expect } from 'vitest';
import { annotation2xml } from '../../src/conversion';

const ANNOTATION = {
  id: 'ad2e62ab-64d8-43b1-9331-271e5390b9d6',
  start: {
    path: "//text[@xml:id='text-1']/body[1]/div[1]/p[4]/hi[1]",
    offset: 5
  },
  end: {
    path: "//text[@xml:id='text-1']/body[1]/div[1]/p[4]/hi[1]",
    offset: 15
  },
  tags: [ 'Name' ]
};

describe('annotation2xml', () => {

  it('should correctly convert an annotation to XML', () => {
    const el = annotation2xml(ANNOTATION);

    console.log(el);

  });

});