import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EMAIL_LOGO_CID, renderEmail } from "../src/modules/email/email-layout.js";

void describe("email layout", () => {
  void it("escapes every value in the HTML version", () => {
    const { html } = renderEmail({
      instanceName: "Camp <b>Nord</b>",
      title: "Reset your password",
      greeting: 'Hello <img src=x onerror="alert(1)">,',
      paragraphs: ["Tom & Jerry's account"],
      action: { label: "Choose a new password", url: 'https://ops.example.org/reset#token="x"' },
    });
    assert.equal(html.includes("<img src=x"), false);
    assert.equal(html.includes("<b>Nord</b>"), false);
    assert.match(html, /Camp &lt;b&gt;Nord&lt;\/b&gt;/);
    assert.match(html, /Tom &amp; Jerry&#39;s account/);
    assert.match(html, /href="https:\/\/ops\.example\.org\/reset#token=&quot;x&quot;"/);
    assert.match(html, new RegExp(`src="cid:${EMAIL_LOGO_CID}"`));
  });

  void it("keeps the text version readable without HTML", () => {
    const { text } = renderEmail({
      instanceName: "Camp Nord",
      title: "Reset your password",
      greeting: "Hello Falke,",
      paragraphs: ["Open this link."],
      action: { label: "Choose a new password", url: "https://ops.example.org/reset" },
      note: "The link works once.",
      footerNote: "If this was not you, contact your organizers.",
    });
    assert.equal(text.includes("<"), false);
    assert.match(text, /^Hello Falke,\n\nOpen this link\.\n\nChoose a new password:\nhttps:\/\/ops\.example\.org\/reset\n\nThe link works once\.\n\n--\nCamp Nord · /);
    assert.match(text, /If this was not you, contact your organizers\.$/);
  });
});
