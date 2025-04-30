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
    const standoff = Converter.parseXML(el);
    console.log(standoff.rows);

    // Get XPointer expressions for character offsets
    const start = standoff.getXPointer(190);
    const end = standoff.getXPointer(200);
    console.log({ start, end });

    // Add inline tags at character positions
    standoff.addInline(190, 252, 'tei-span', { role: 'highlighting' });

    const serialized = Converter.serializeStandoff(standoff);
    document.getElementById('serialized').appendChild(serialized);
  });
};
```

## Usage in Node.js

TODO...





