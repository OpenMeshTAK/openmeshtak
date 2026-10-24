import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { strToU8, unzipSync, zipSync } from "fflate";
import { readRubberSheet } from "../src/modules/data-packages/atak/rubber-sheet.js";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const kml = `<kml><GroundOverlay><name>Game map</name><Icon><href>files/image.png</href></Icon>
  <LatLonBox><north>52.38</north><south>52.37</south><east>11.84</east><west>11.81</west></LatLonBox>
</GroundOverlay></kml>`;

void describe("rubber sheet detection", () => {
  void it("decompresses only the KML and the image it names", () => {
    const junk = new Uint8Array(4096).map((_, index) => index % 251);
    const kmz = zipSync({ "junk.bin": [junk, { level: 6 }], "doc.kml": strToU8(kml), "files/image.png": png });
    // Corrupt the deflate stream of the unrelated first entry (local header 30 bytes + its name):
    // reading it would throw, as would decompressing a bomb of unrelated entries.
    kmz[30 + "junk.bin".length] = 0xff;
    assert.throws(() => unzipSync(kmz));

    assert.deepEqual(readRubberSheet(kmz), {
      name: "Game map",
      imagePath: "files/image.png",
      imageMediaType: "image/png",
      corners: [[11.81, 52.37], [11.84, 52.37], [11.84, 52.38], [11.81, 52.38]],
    });
  });

  void it("ignores an image path that leaves the archive", () => {
    const kmz = zipSync({ "doc.kml": strToU8(kml.replace("files/image.png", "../image.png")), "../image.png": png });
    assert.equal(readRubberSheet(kmz), null);
  });
});
