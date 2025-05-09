import { describe, it, expect } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import { xml2annotation } from '../../src/conversion';

describe('xml2annotation', () => {

  const createElementFromXML = (xmlString: string): Element => {
    const parser = new DOMParser();
    return parser.parseFromString(xmlString, 'text/xml').documentElement as unknown as Element;
  }

  it('should correctly parse an annotation from XML', () => {
    const xml = `
      <annotation target="//text[@xml:id='text-1']/body[1]/div[1]/p[4]/hi[1]::5 //text[@xml:id='text-1']/body[1]/div[1]/p[4]/hi[1]::15" xml:id="uid-ad2e62ab-64d8-43b1-9331-271e5390b9d6">
        <revisionDesc>
          <change who="#uid-6ff04674-b299-4c7c-bbea-79d6b89d92ba" when="2025-04-23T12:19:44.949Z" status="created"/>
          <change who="#uid-6ff04674-b299-4c7c-bbea-79d6b89d92ba" when="2025-04-23T12:19:43.637Z" status="modified"/>
        </revisionDesc>
        <note resp="#uid-6ff04674-b299-4c7c-bbea-79d6b89d92ba">Author</note>
        <rs ana="Name"/>
        <respStmt xml:id="uid-6ff04674-b299-4c7c-bbea-79d6b89d92ba">
          <name>aboutgeo</name>
        </respStmt>
      </annotation>
    `;

    const element = createElementFromXML(xml);
    
    const annotation = xml2annotation(element, []);

    expect(annotation.id).toBe('ad2e62ab-64d8-43b1-9331-271e5390b9d6');
    expect(annotation.start.path).toBe('//text[@xml:id=\'text-1\']/body[1]/div[1]/p[4]/hi[1]');
    expect(annotation.start.offset).toBe(5);
    expect(annotation.end.path).toBe('//text[@xml:id=\'text-1\']/body[1]/div[1]/p[4]/hi[1]');
    expect(annotation.end.offset).toBe(15);
    expect(annotation.tags.length).toBe(1);
    expect(annotation.tags[0].label).toBe('Name');
  });

});