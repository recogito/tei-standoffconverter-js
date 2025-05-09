import { describe, it, expect } from 'vitest';
import { getChildren } from '../../src/dom';
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
  tags: [{ label: 'Name' }]
};

describe('annotation2xml', () => {

  it('should correctly convert an annotation to XML', () => {
    const el = annotation2xml(ANNOTATION);

    const xmlId = el.getAttribute('xml:id');
    expect(xmlId).toBe('uid-ad2e62ab-64d8-43b1-9331-271e5390b9d6')

    const target = el.getAttribute('target');
    expect(target).toBeDefined();

    const [start, end] = target.split(' ');
    expect(start).toBeDefined();
    expect(end).toBeDefined();

    const [startPath, startOffset] = start.split('::');
    const [endPath, endOffset] = end.split('::');

    expect(startPath).toBe('//text[@xml:id=\'text-1\']/body[1]/div[1]/p[4]/hi[1]');
    expect(startOffset).toBe('5');

    expect(endPath).toBe('//text[@xml:id=\'text-1\']/body[1]/div[1]/p[4]/hi[1]');
    expect(endOffset).toBe('15');
    
    const tags = getChildren(el, 'rs');
    expect(tags.length).toBe(1);
    expect(tags[0].tagName).toBe('rs');
    expect(tags[0].getAttribute('ana')).toBe('Name');
  });

});