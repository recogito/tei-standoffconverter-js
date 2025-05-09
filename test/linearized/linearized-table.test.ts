import { describe, it, expect } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import { parseXML } from '../../src';
import { createLinearizedTable } from '../../src/linearized';
import type { MarkupToken, StandoffAnnotation } from '../../src/types';

describe('createLinearizedTable', () => {
  const createDocument = () => {
    const parser = new DOMParser();
    return parser.parseFromString('<!DOCTYPE html><body></body>', 'text/xml');
  } 

  it('should serialize to text correctly', () => {
    const doc = createDocument();
    const root = doc.createElement('root') as unknown as Element;

    const rows: MarkupToken[] = [
      { type: 'open', position: 0, el: root, depth: 0 },
      { type: 'text', position: 0, el: null, text: 'Hello, world!', depth: 0 },
      { type: 'close', position: 13, el: root, depth: 0 }
    ];

    const table = createLinearizedTable(doc.documentElement as unknown as Element, rows);

    table.addInline(0, 5, 'childNode', { 'role': 'testing' });

    const serialized = table.xmlString();
    expect(serialized.includes('childNode')).toBeTruthy();

    const updatedText = table.text();
    expect(updatedText).toContain('Hello');
  });

  it('should generate correct XPointer expressions', () => {
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
            <div></div>
            <div>Hello World</div>
            <div>
              <p>This is a <hi rend="italic">sample</hi> paragraph with <term>markup</term>.</p>
            </div>
            <div></div>
          </body>
        </text>
      </TEI>
    `;

    const parsed = parseXML(xml);
    
    const text = parsed.text().substring(190, 194);
    expect(text).toBe('is a');

    const pointer = parsed.getXPointer(190);
    expect(pointer).toBe('/TEI[1]/text[1]/body[1]/div[3]/p[1]::5');
  });

  it('should generate correct character offsets', () => {
    const xml = `
      <TEI>
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>Sample TEI Document</title>
            </titleStmt>
          </fileDesc>
        </teiHeader>
        <text>
          <body>
            <p />
            <p>This is a <hi rend="italic">sample</hi> paragraph with <term>markup</term>.</p>
          </body>
        </text>
      </TEI>
    `;

    const parsed = parseXML(xml);

    const text = parsed.text().substring(151, 155);
    expect(text).toBe('is a');

    const offset = parsed.getCharacterOffset('/TEI[1]/text[1]/body[1]/p[2]::5');
    expect(offset).toBe(151);
  });
  

  it('should correctly add inline elements', () => {
    const doc = createDocument();
    const root = doc.createElement('root') as unknown as Element;

    const rows: MarkupToken[] = [
      { type: 'open', position: 0, el: root, depth: 0 },
      { type: 'text', position: 0, el: null, text: 'Hello, world!', depth: 0 },
      { type: 'close', position: 13, el: root, depth: 0 }
    ];

    const table = createLinearizedTable(root, rows);

    table.addInline(0, 5, 'childNode', { 'role': 'testing' });

    expect(table.tokens.length).toBe(6);

    const newRow = table.tokens.find(token => token.type === 'open' && (token.el as Element)?.tagName === 'childNode');
    expect(newRow).toBeTruthy();
    expect((newRow?.el as Element)?.getAttribute('role')).toBe('testing');
  });

  it('should correctly add inline elements at tag boundaries', () => {
    const xml = `
      <TEI xmlns="http://www.tei-c.org/ns/1.0">
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>Untitled Text</title>
            </titleStmt>
            <publicationStmt>
              <p>Unpublished</p>
            </publicationStmt>
            <sourceDesc>
              <p>Plain text input</p>
            </sourceDesc>
          </fileDesc>
        </teiHeader>
        <text>
          <body>
            <p>The victory at Saratoga proved especially significant because it helped persuade the French
              to form an alliance with the United States. The treaty of alliance, brokered by Franklin and
              signed in early 1778, brought much-needed financial help from France to the war effort,
              along with the promise of military aid. But despite the important victory won by General
              Gates to the north, Washington continued to struggle against the main British army.</p>
            <p>A painting shows George Washington standing on a promontory above the Hudson River wearing
              a military coat and holding a tricorner hat and sword in his hand. Just behind Washington
              his slave William</p>
            <p>John Trumbull painted this wartime image of Washington on a promontory above the Hudson
              River. Washington’s enslaved valet William “Billy” Lee stands behind him and British
              warships fire on a U.S. fort in the background. Lee rode alongside Washington for the
              duration of the Revolutionary War.</p>
            <p>For Washington, 1777 was dispiriting in that he failed to win any grand successes. The
              major battles came in the fall, when the British army sailed from New York and worked its
              way up the Chesapeake Bay, aiming to capture Philadelphia, the seat of American power where
              the Continental Congress met. Washington tried to stop the British, fighting at Brandywine
              Bridge and Germantown in September and October. He lost both battles, and the defeat at
              Germantown was especially severe. The British easily seized Philadelphia—a victory, even
              though Congress had long since left the capital and reconvened in nearby Lancaster and York.
              The demoralized Continentals straggled to a winter camp at Valley Forge, where few supplies 
              reached them, and Washington grew frustrated that the states were not meeting congressional 
              requisitions of provisions for the troops. Sickness incapacitated the undernourished soldiers. 
              Many walked through the snow barefoot, leaving bloody footprints behind. (See the Joseph Plumb 
              Martin The Adventures of a Revolutionary Soldier 1777 Primary Source.)</p>
          </body>
        </text>
      </TEI>`;

    const parsed = parseXML(xml);

    // 'John Trumbull'
    expect(parsed.text().substring(989, 1002)).toBe('John Trumbull');

    parsed.addInline(988, 1002, 'persName');

    // Debug logging
    // console.log(parsed.xmlString());
    // const idxOf = (t: MarkupToken) => parsed.tokens.indexOf(t)
    // console.log(parsed.tokens.map(t => ({ i: idxOf(t), pos: t.position, name: t.el?.tagName, type: t.type, depth: t.depth })))

    const tokensToVerify = parsed.tokens.filter(t => t.el && t.position >= 988 && t.position <= 1324);
    // console.log(tokensToVerify.map(t => ({ i: idxOf(t), pos: t.position, name: t.el?.tagName, type: t.type, depth: t.depth })))

    expect(tokensToVerify[0].position).toBe(988);
    expect(tokensToVerify[0].el.tagName).toBe('persName');
    expect(tokensToVerify[0].type).toBe('open');

    expect(tokensToVerify[1].position).toBe(989);
    expect(tokensToVerify[1].el.tagName).toBe('persName');
    expect(tokensToVerify[1].type).toBe('close');

    expect(tokensToVerify[2].position).toBe(989);
    expect(tokensToVerify[2].el.tagName).toBe('p');
    expect(tokensToVerify[2].type).toBe('open');

    expect(tokensToVerify[3].position).toBe(989);
    expect(tokensToVerify[3].el.tagName).toBe('persName');
    expect(tokensToVerify[3].type).toBe('open');

    expect(tokensToVerify[4].position).toBe(1002);
    expect(tokensToVerify[4].el.tagName).toBe('persName');
    expect(tokensToVerify[4].type).toBe('close');

    expect(tokensToVerify[5].position).toBe(1324);
    expect(tokensToVerify[5].el.tagName).toBe('p');
    expect(tokensToVerify[5].type).toBe('close');
  });

  it('should correctly add standoff annotations', () => {
    const doc = createDocument();
    const tei = doc.createElement('TEI') as unknown as Element;
    const teiHeader = doc.createElement('teiHeader') as unknown as Element;
    const text = doc.createElement('text') as unknown as Element;

    const tokens: MarkupToken[] = [
      { type: 'open', position: 0, el: tei, depth: 0 },
      { type: 'open', position: 0, el: teiHeader, depth: 1 },
      { type: 'close', position: 0, el: teiHeader, depth: 1},
      { type: 'open', position: 0, el: text, depth: 1},
      { type: 'text', position: 0, el: null, text: 'Hello World!', depth: 1 },
      { type: 'close', position: 12, el: text, depth: 1},
      { type: 'close', position: 12, el: tei, depth: 0}
    ]
    
    const table = createLinearizedTable(tei, tokens);

    // Add new standOff block
    table.addStandOff('standoff-1');

    const annotation: StandoffAnnotation = {
      id: 'fc2a0e90-dde4-4e38-8956-2930ec462116',
      start: {
        path: '//text[1]',
        offset: 2,
      },
      end: {
        path: '//text[1]',
        offset: 4
      },
      tags: [{ label: 'tag' }]
    };

    table.addAnnotation('standoff-1', annotation);

    expect(table.tokens.length).toBe(15);

    const xmlStr = table.xmlString();
    expect(xmlStr).toContain('//text[1]::2');
    expect(xmlStr).toContain('//text[1]::4');
    expect(xmlStr).toContain('rs ana="tag"');
  });

  it('should correctly create standoff tags from the helper', () => {
    const doc = createDocument();
    const tei = doc.createElement('TEI') as unknown as Element;
    const teiHeader = doc.createElement('teiHeader') as unknown as Element;
    const text = doc.createElement('text') as unknown as Element;

    const tokens: MarkupToken[] = [
      { type: 'open', position: 0, el: tei, depth: 0 },
      { type: 'open', position: 0, el: teiHeader, depth: 1 },
      { type: 'close', position: 0, el: teiHeader, depth: 1},
      { type: 'open', position: 0, el: text, depth: 1},
      { type: 'text', position: 0, el: null, text: 'Hello World!', depth: 1 },
      { type: 'close', position: 12, el: text, depth: 1},
      { type: 'close', position: 12, el: tei, depth: 0}
    ]
    
    const table = createLinearizedTable(tei, tokens);

    // Add new standOff block
    table.addStandOff('standoff-1');

    const newTokens = table.tokens.filter(t => t.el?.tagName === 'standOff' || t.el?.tagName === 'listAnnotation');
    expect(newTokens.length).toBe(4);

    // Add simple string standOff tag
    table.addStandOffTag('standoff-1', 2, 4, 'persName');
    table.addStandOffTag('standoff-1', 9, 11, { label: 'Place', id: 'placeName' });

    const xmlStr = table.xmlString();

    expect(xmlStr).toContain('annotation xml:id="uid-');
    expect(xmlStr).toContain('target="/text[1]::2 /text[1]::4"');
    expect(xmlStr).toContain('rs ana="persName"');
  });

});
