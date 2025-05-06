# Recogito TEI/XML Standoff Converter

A JavaScript/TypeScript utility that bridges the gap between TEI/XML documents and plaintext processing tools. This library creates a reversible mapping between TEI/XML markup and character offsets in plaintext, allowing you to apply text analysis tools to TEI documents without losing markup context.

The core logic was ported to TypeScript from the excellent Python [standoffconverter](https://github.com/standoff-nlp/standoffconverter) by [@millawell](https://github.com/millawell).

```sh
npm install @recogito/standoff-converter
```

## Why?

Text analysis (e.g. Named Entity Recognition) typically works with plaintext, but TEI/XML documents contain structured markup that gets lost when converting to plaintext. When these tools identify entities or other features at specific character positions, it's difficult to map those positions back to the original TEI structure.

This library:
- Creates a linearized representation that maintains the relationship between plaintext character positions and XML markup.
- Allows you to process the plaintext with any text analysis tool.
- Maps the identified features back to the exact location in the original XML.
- Modifies the TEI/XML structure while preserving all existing markup.

Perfect for enriching TEI documents with automatically extracted entities, annotations, or other textual features!

## Features

- Extract plaintext from TEI/XML while preserving a bidirectional mapping between character offsets and markup.
- Convert between plaintext character offsets and TEI XPointer expressions.
- Insert new inline tags at specific character positions (e.g. add `<placeName>` or `<persName>` tags based on NER results).
- Preserve all original markup when serializing changes back to TEI/XML.
- Works in both Node.js and browser environments.

## Usage in Node

This library works in Node (using [xmldom](https://github.com/xmldom/xmldom) and [xpath](https://github.com/goto100/xpath) internally).

```ts
import { parseXML } from '@recogito/standoff-converter';

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

const parsed = parseXML(xml);

// Get plaintext
const text = parsed.text();

// XPointer expression from character position
const xpointer = parsed.getXPointer(550);

// Character position from XPointer expression
const position = parsed.getCharacterOffset('//TEI/text[1]/body[1]/p[1]/::5');

// Add inline tag at character position
parsed.addInline(5, 7, 'rs', { resp: 'aboutgeo' });

// Modified markup as a DOM Element
const el = parsed.xml();

// Modified markup serialized to string
const xml = parsed.xmlString();
```

## Usage in the Browser

You can use this library in the browser in combination with [CETEIcean](https://github.com/TEIC/CETEIcean).

```ts
import { parseXML } from '@recogito/standoff-converter';

window.onload = async function () {
  const CETEIcean = new CETEI();

  CETEIcean.getHTML5('paradise-lost.xml', data => {
    document.getElementById('orig').appendChild(data);
    const el = document.getElementById('orig').firstChild;

    // Parse CETEIcean content
    const parsed = parseXML(el);

    // Get XPointer expressions from plaintext character offsets
    console.log(parsed.getXPointer(550));

    // Get character offsets from an XPointer expression (format: path::offset)
    const xpointer = '//text[@xml:id="text-1"]/body[1]/div[1]/p[4]/hi[1]::5';
    console.log(parsed.getCharacterOffset(xpointer));

    // Add inline tags at character positions
    parsed.addInline(550, 560, 'tei-note', { type: 'comment', resp: 'aboutgeo' });

    // Serialize back to TEI/XML
    const teiElement = parsed.toXML();
    document.getElementById('serialized').appendChild(teiElement);
  });
};
```

## API Reference

### Core TEI Functions

| Function | Description | Parameters | Return Value |
|----------------|-------------|------------|--------------|
| `parseXML(input)` | Parse TEI/XML | `input`: XML string, Element, or Document | `parsed` instance |
| `parsed.text()` | Get plaintext | None | `string` |
| `parsed.tokens` | Access linearized token array | Property | `Array` of token objects |
| `parsed.xml()` | Get XML as DOM Element | None | `Element` |
| `parsed.xmlString()` | Get XML as serialized string | None | `string` |
| `parsed.getXPointer(offset)` | Convert character offset to XPointer | `offset`: number | `string` XPointer expression |
| `parsed.getCharacterOffset(xpointer)` | Convert XPointer to character offset | `xpointer`: string | `number` |
| `parsed.addInline(start, end, tagName, attrs)` | Insert inline tag at character positions | `start`: number<br>`end`: number<br>`tagName`: string<br>`attrs`: object | `void` |
| `parsed.toXML()` | Serialize modified content to XML | None | `Element` or `Document` |

### Recogito-Specific Annotation Functions

| Function/Method | Description | Parameters | Return Value |
|----------------|-------------|------------|--------------|
| `parsed.annotations(standOffId?)` | Get standoff annotations from all or a specific TEI `<standOff>` element | `string` (optional) | `Array` of standoff annotation objects |
| `parsed.addStandOff(id)` | Add a new TEI `<standOff>` element | `id`: string | `string` annotation ID |
| `parsed.addAnnotation(annotation, standOffId)` | Add Recogito annotation | `annotation`: standoff annotation<br>`standOffId`: string | `void` |

## TODO

- **Handle existing standoff elements**. Currently, this library parses the markup only, but ignores `<standOff>` blocks in the TEI. Therefore, annotation offsets in existing standOff elements will break if the TEI is modified. We would need to parse the standOff elements, too, and incorprate them into the standoff map, in order to keep standoff pointers in sync with the TEI document.





