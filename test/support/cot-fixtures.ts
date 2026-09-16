import { strToU8, zipSync } from "fflate";

/**
 * Synthetic CoT shaped like real WinTAK Data Packages (German locale decimal commas, signed ARGB
 * colours, `<archive/>`). Coordinates and names are invented; no creator IDs are included.
 */
export const spotMarker = `<event version="2.0" uid="11111111-1111-4111-8111-111111111111" type="b-m-p-s-m" time="2026-08-30T19:34:46.20Z" start="2026-08-30T19:34:46.20Z" stale="2027-08-30T19:34:46.20Z" how="h-g-i-g-o" access="Undefined">
  <point lat="50.1101" lon="8.6821" hae="112.5" ce="9999999" le="9999999" />
  <detail>
    <contact callsign="ALPHA" />
    <archive />
    <color argb="-35072" />
    <usericon iconsetpath="COT_MAPPING_SPOTMAP/b-m-p-s-m/-35072" />
    <remarks>Meet here &amp; wait</remarks>
  </detail>
</event>`;

export const freeformArea = `<event version="2.0" uid="22222222-2222-4222-8222-222222222222" type="u-d-f" time="2026-08-30T19:19:41.48Z" start="2026-08-30T19:19:41.48Z" stale="2026-09-06T19:19:41.48Z" how="h-e" access="Undefined">
  <point lat="50.105" lon="8.685" hae="83.14" ce="9999999" le="9999999" />
  <detail>
    <contact callsign="AREA ONE" />
    <strokeColor value="-16711936" />
    <fillColor value="402718464" />
    <remarks />
    <clamped value="False" />
    <link point="50.10000000,8.68000000,82,73679294" />
    <link point="50.11000000,8.68000000,81,92052089" />
    <link point="50.11000000,8.69000000,81,5" />
    <link point="50.10000000,8.69000000,82,0" />
    <link point="50.10000000,8.68000000,82,73679294" />
    <height value="0.00" />
    <archive />
    <strokeStyle value="solid" />
    <strokeWeight value="1" />
  </detail>
</event>`;

export const circle = `<event version="2.0" uid="33333333-3333-4333-8333-333333333333" type="u-d-c-c" time="2026-08-30T19:24:16.10Z" start="2026-08-30T19:24:16.10Z" stale="2026-09-06T19:24:16.10Z" how="h-g-i-g-o" access="Undefined"><point lat="50.1083" lon="8.6744" hae="81.91" ce="9999999" le="9999999" /><detail><contact callsign="WATCH" /><fillColor value="956301439" /><strokeColor value="-16777089" /><strokeWeight value="4,5" /><archive /><shape><ellipse minor="46.3797363938226" angle="360" major="46.3797363938226" /></shape></detail></event>`;

export const route = `<event version="2.0" uid="44444444-4444-4444-8444-444444444444" type="b-m-r" time="2026-08-30T19:24:16.10Z" start="2026-08-30T19:24:16.10Z" stale="2026-09-06T19:24:16.10Z" how="h-e"><point lat="50.1" lon="8.6" hae="0" ce="9999999" le="9999999" /><detail><contact callsign="ROUTE" /></detail></event>`;

export function manifest(name: string, uids: string[]): string {
  const contents = uids
    .map((uid) => `    <Content zipEntry="${uid}/${uid}.cot" ignore="false">\n      <Parameter name="uid" value="${uid}" />\n    </Content>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<MissionPackageManifest version="2">
  <Configuration>
    <Parameter name="name" value="${name}" />
    <Parameter name="uid" value="99999999-9999-4999-8999-999999999999" />
  </Configuration>
  <Contents>
${contents}
  </Contents>
</MissionPackageManifest>`;
}

/** Builds a Data Package ZIP in the layout ATAK writes. */
export function dataPackageZip(events: Record<string, string>, extra: Record<string, string> = {}): Buffer {
  const files: Record<string, Uint8Array> = {
    "MANIFEST/manifest.xml": strToU8(manifest("Synthetic", Object.keys(events))),
  };
  for (const [uid, xml] of Object.entries(events)) {
    files[`${uid}/${uid}.cot`] = strToU8(xml);
  }
  for (const [path, content] of Object.entries(extra)) {
    files[path] = strToU8(content);
  }
  return Buffer.from(zipSync(files));
}
