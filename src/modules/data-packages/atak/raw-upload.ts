import express, { type RequestHandler } from "express";
import { ProblemError } from "../../../shared/errors/problem-error.js";
import { MAX_UPLOAD_BYTES } from "./data-package-archive.js";

/** Uploads arrive as raw bytes (ZIP or CoT XML); JSON bodies are parsed elsewhere and rejected. */
export const rawUpload: RequestHandler = express.raw({
  type: ["application/zip", "application/octet-stream", "application/xml", "text/xml"],
  limit: MAX_UPLOAD_BYTES,
});

export function uploadedBytes(request: unknown): Uint8Array {
  const body = (request as { body?: unknown }).body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:unsupported-media-type",
      title: "Unsupported upload",
      status: 415,
      detail: "Send the Data Package as application/zip or a CoT file as application/xml.",
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  }
  return new Uint8Array(body);
}
