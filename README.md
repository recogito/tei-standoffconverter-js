# Recogito TEI/XML Standoff Converter

A TEI manipulation utility. Parses the TEI/XML document into a linearized representation that allows you to make changes to the TEI based on text character offsets. The core logic was ported to TypeScript from the excellent Python [standoffconverter](https://github.com/standoff-nlp/standoffconverter) by [@millawell](https://github.com/millawell).

```sh
npm install @recogito/standoff-converter
```

## Features

- Convert TEI/XML to plaintext, while retaining a mapping between text character offsets and original TEI/XML markup structure.
- Compute XPointer expressions from plaintext character offsets.
- Compute character offsets from XPointer expressions.
- Modify TEI content easily by inserting new tags at plaintext character offsets. (E.g. insert new `<placeName>` or `<persName>` tags based on Named Entity parsing results!).
- Serialize modified data back to TEI/XML.

## Usage in the Browser

You can use this library in the browser in combination with [CETEIcean](https://github.com/TEIC/CETEIcean).

```ts
import { parseXML } from '@recogito/standoff-converter';

window.onload = async function () {
  var CETEIcean = new CETEI();

  CETEIcean.getHTML5('paradise-lost.xml', data => {
    document.getElementById('orig').appendChild(data);
    const el = document.getElementById('orig').firstChild;

    // Parse CETEIcean content into a linearized representation
    const parsed = parseXML(el);
    console.log(parsed.tokens);

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

## Usage in Node

This library works in Node (using [linkedom](https://github.com/WebReflection/linkedom) internally).

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

// Export XML as linkedom Element
const el = parsed.xml();

// Export XML as serialized string
const xml = parsed.xmlString();
```

## TODO

- **Utility function to remove whitespace**. Some NER packages may collapse whitespace/newlines from text. This would lead to inconsistent character offsets between plaintext extracted via `.text()` and the NER tokens.

- **Handle existing standoff elements**. Currently, this library parses the markup only, but ignores `<standOff>` blocks in the TEI. Therefore, annotation offsets in existing standOff elements will break if the TEI is modified. We would need to parse the standOff elements, too, and incorprate them into the standoff map, in order to keep standoff pointers in sync with the TEI document.





