import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import request from "supertest";
import { readUploadedFile } from "../src/modules/missions/tak-uploads.js";

void describe("TAK multipart uploads", () => {
  for (const fileName of ["photo.jpg", null]) {
    void it(`reads an assetfile ${fileName === null ? "without a filename" : "with a filename"}`, async () => {
      const app = express();
      app.post("/upload", async (incoming, response) => {
        const file = await readUploadedFile(incoming);
        assert.notEqual(file, null);
        assert.equal(file?.fileName, fileName);
        assert.equal(Buffer.from(file?.bytes ?? []).toString("utf8"), "photo bytes");
        response.sendStatus(204);
      });

      const boundary = "----openmeshtak-test";
      const filenameParameter = fileName === null ? "" : `; filename="${fileName}"`;
      const body = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="assetfile"${filenameParameter}\r\n`
        + "Content-Type: application/octet-stream\r\n\r\nphoto bytes\r\n"
        + `--${boundary}--\r\n`,
      );

      await request(app).post("/upload")
        .set("Content-Type", `multipart/form-data; boundary=${boundary}`)
        .send(body)
        .expect(204);
    });
  }
});
