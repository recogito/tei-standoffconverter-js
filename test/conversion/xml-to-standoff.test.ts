import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { xml2standoff } from '../../src/conversion/xml-to-standoff';

describe('xml2standoff', () => {

  const createElementFromXML = (xmlString: string): Element => {
    const dom = new JSDOM(xmlString, { contentType: 'text/xml' });
    return dom.window.document.documentElement;
  }

  it('should handle a simple XML element', () => {
    const xml = '<root>Hello, world!</root>';
    const element = createElementFromXML(xml);
    const result = xml2standoff(element);

    expect(result).toHaveLength(3);
    expect(result[0].row_type).toBe('open');
    expect(result[0].position).toBe(0);
    expect(result[1].row_type).toBe('text');
    expect(result[1].text).toBe('Hello, world!');
    expect(result[1].position).toBe(0);
    expect(result[2].row_type).toBe('close');
    expect(result[2].position).toBe(13); // Length of "Hello, world!"
  });

  it('should handle nested elements', () => {
    const xml = '<root><child>Text</child></root>';
    const element = createElementFromXML(xml);
    const result = xml2standoff(element);

    expect(result).toHaveLength(5);
    expect(result[0].row_type).toBe('open');
    expect(result[0].el.nodeName).toBe('root');
    expect(result[0].position).toBe(0);
    expect(result[1].row_type).toBe('open');
    expect(result[1].el.nodeName).toBe('child');
    expect(result[1].position).toBe(0);
    expect(result[2].row_type).toBe('text');
    expect(result[2].text).toBe('Text');
    expect(result[2].position).toBe(0);
    expect(result[3].row_type).toBe('close');
    expect(result[3].el.nodeName).toBe('child');
    expect(result[3].position).toBe(4);
    expect(result[4].row_type).toBe('close');
    expect(result[4].el.nodeName).toBe('root');
    expect(result[4].position).toBe(4);
  });

  it('should handle elements with attributes', () => {
    const xml = '<root id="main"><child type="item">Content</child></root>';
    const element = createElementFromXML(xml);
    const result = xml2standoff(element);

    expect(result).toHaveLength(5);
    
    expect(result[0].row_type).toBe('open');
    expect(result[0].position).toBe(0);
    expect((result[0].el as Element).getAttribute('id')).toBe('main');
    
    expect(result[1].row_type).toBe('open');
    expect(result[1].position).toBe(0);
    expect((result[1].el as Element).getAttribute('type')).toBe('item');
    
    expect(result[2].row_type).toBe('text');
    expect(result[2].text).toBe('Content');
    expect(result[2].position).toBe(0);
    
    expect(result[3].row_type).toBe('close');
    expect(result[3].position).toBe(7);
    
    expect(result[4].row_type).toBe('close');
    expect(result[4].position).toBe(7);
  });

  it('should handle multiple text nodes and elements', () => {
    const xml = '<root>Before<middle>Inside</middle>After</root>';
    const element = createElementFromXML(xml);
    const result = xml2standoff(element);

    expect(result).toHaveLength(7);
    
    expect(result[0].row_type).toBe('open');
    expect(result[0].position).toBe(0);
    
    expect(result[1].row_type).toBe('text');
    expect(result[1].text).toBe('Before');
    expect(result[1].position).toBe(0);
    
    expect(result[2].row_type).toBe('open');
    expect(result[2].position).toBe(6);
    
    expect(result[3].row_type).toBe('text');
    expect(result[3].text).toBe('Inside');
    expect(result[3].position).toBe(6);
    
    expect(result[4].row_type).toBe('close');
    expect(result[4].position).toBe(12);
    
    expect(result[5].row_type).toBe('text');
    expect(result[5].text).toBe('After');
    expect(result[5].position).toBe(12);
    
    expect(result[6].row_type).toBe('close');
    expect(result[6].position).toBe(17);
  });

  it('should handle empty elements', () => {
    const xml = '<root><empty></empty></root>';
    const element = createElementFromXML(xml);
    const result = xml2standoff(element);

    expect(result).toHaveLength(4);
    expect(result[0].row_type).toBe('open');
    expect(result[1].row_type).toBe('open');
    expect(result[2].row_type).toBe('close');
    expect(result[3].row_type).toBe('close');
  });


  it('should handle complex nested structure', () => {
    const xml = `
      <TEI xmlns="http://www.tei-c.org/ns/1.0">
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>Sample TEI Document</title>
            </titleStmt>
          </fileDesc>
        </teiHeader>
        <text>
          <body>
            <p>This is a <hi rend="italic">sample</hi> paragraph with <term>markup</term>.</p>
          </body>
        </text>
      </TEI>
    `;
    
    const element = createElementFromXML(xml);
    const result = xml2standoff(element);
    
    // Check that all elements are captured
    const openElements = result.filter(r => r.row_type === 'open').map(r => r.el?.tagName);
    const textNodes = result.filter(r => r.row_type === 'text').map(r => r.text);
    
    expect(openElements).toContain('TEI');
    expect(openElements).toContain('teiHeader');
    expect(openElements).toContain('fileDesc');
    expect(openElements).toContain('titleStmt');
    expect(openElements).toContain('title');
    expect(openElements).toContain('text');
    expect(openElements).toContain('body');
    expect(openElements).toContain('p');
    expect(openElements).toContain('hi');
    expect(openElements).toContain('term');
    
    expect(textNodes).toContain('Sample TEI Document');
    expect(textNodes).toContain('This is a ');
    expect(textNodes).toContain('sample');
    expect(textNodes).toContain(' paragraph with ');
    expect(textNodes).toContain('markup');
    expect(textNodes).toContain('.');
  });

  it('should parse XML from a string', () => {
    const xml = `
      <TEI xmlns="http://www.tei-c.org/ns/1.0">
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>Sample TEI Document</title>
            </titleStmt>
          </fileDesc>
        </teiHeader>
        <text>
          <body>
            <p>This is a <hi rend="italic">sample</hi> paragraph with <term>markup</term>.</p>
          </body>
        </text>
      </TEI>
    `;

    const result = xml2standoff(xml);

    // Keep in mind this will retain whitespace as text nodes!
    expect(result.length).toBe(39);
  });
 
});