# Recogito TEI/XML Standoff Converter

Converts between TEI/XML and a standoff markup representation. The core logic was ported to 
TypeScript from the excellent Python [standoffconverter](https://github.com/standoff-nlp/standoffconverter) 
by [@millawell](https://github.com/millawell).

## Features

- Convert TEI/XML to plaintext, while retaining a mapping between text character offsets and TEI/XML markup position.
- Compute XPointer expressions from plaintext character offsets.
- Modify TEI content easily by inserting new tags at plaintext character offsets. (E.g. insert new `<placeName>` or `<persName>` tags based on Named Entity parsing results!)
- Serialize plaintext and (modified) standoff data back to TEI/XML.

## Usage in the Browser

You can use this library in the browser in combination with [CETEIcean](https://github.com/TEIC/CETEIcean).

```ts
import { parseTEI, serializeStandoff } from '@recogito/standoff-converter';

window.onload = async function () {
  var CETEIcean = new CETEI();

  CETEIcean.getHTML5('paradise-lost.xml', data => {
    document.getElementById('orig').appendChild(data);
    const el = document.getElementById('orig').firstChild;

    // Parse CETEIcean content into a standoff representation
    const standoff = parseXML(el);
    console.log(standoff.rows);

    // Get XPointer expressions for character offsets
    const start = standoff.getXPointer(190);
    const end = standoff.getXPointer(200);
    console.log({ start, end });

    // Add inline tags at character positions
    standoff.addInline(190, 252, 'tei-span', { role: 'highlighting' });

    const serialized = serializeStandoff(standoff);
    document.getElementById('serialized').appendChild(serialized);
  });
};
```

## Usage in Node

This library works in Node (using [JSDOM](https://github.com/jsdom/jsdom) internally).

```ts
import { parseTEI, serializeStandoff } from '@recogito/standoff-converter';

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

const standoff = parseXML(xml);
```

## TODO

- **XML string serialization method** (currently, "serialization" returns an `Element` type object, which isn't directly usable in many cases, e.g. NodeJS + file storage etc.)
- **Add functionality for exporting/importing standoff information from JSON** (currently, the standoff table maintains references to `Element` objects, which wouldn't be serializable).





