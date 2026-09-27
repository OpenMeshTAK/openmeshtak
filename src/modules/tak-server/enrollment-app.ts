import type { TLSSocket } from "node:tls";
import express, { type Express, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { logger } from "../../shared/logging/logger.js";
import {
  authenticateProfileRequest,
  CertificateRequestError,
  EnrollmentAuthenticationError,
  signEnrollmentRequest,
  type SignedEnrollment,
} from "./enrollment.service.js";
import { sendDeviceProfile } from "./marti/profile-response.js";
import { takAccessFor } from "./tak-access.js";

/** Escapes text for the small XML documents below; values are base64 or fixed strings anyway. */
function xmlText(value: string): string {
  return value.replace(/[<>&"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

/**
 * Subject fields the TAK app should put into its CSR. Core ignores everything but the common name
 * and sets the subject itself, so these are only hints for the app.
 */
function tlsConfig(_request: Request, response: Response): void {
  response
    .type("text/plain")
    .send(
      '<ns2:certificateConfig xmlns="http://bbn.com/marti/xml/config" xmlns:ns2="com.bbn.marti.config">' +
        '<nameEntries><nameEntry name="O" value="OpenMeshTak"/><nameEntry name="OU" value="OpenMeshTak"/></nameEntries>' +
        "</ns2:certificateConfig>",
    );
}

/**
 * TAK Server answers `signClient/v2` with JSON unless the app asks for XML. iTAK expects the JSON
 * form even when it sends `Accept: text/plain`, so only an explicit XML request gets XML.
 */
function sendEnrollment(request: Request, response: Response, enrollment: SignedEnrollment): void {
  const accept = request.get("Accept") ?? "";
  if (accept.includes("xml")) {
    const authorities = enrollment.authorities.map((ca) => `<ca>${xmlText(ca)}</ca>`).join("");
    response
      .type("application/xml")
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<enrollment><signedCert>${xmlText(enrollment.signedCertificate)}</signedCert>${authorities}</enrollment>`);
    return;
  }
  const body: Record<string, string> = { signedCert: enrollment.signedCertificate };
  enrollment.authorities.forEach((ca, index) => {
    body[`ca${String(index)}`] = ca;
  });
  response.type(accept.includes("text/plain") ? "text/plain" : "application/json").send(JSON.stringify(body));
}

async function signClient(request: Request, response: Response): Promise<void> {
  const clientUid = request.query.clientUid ?? request.query.clientUID;
  try {
    const enrollment = await signEnrollmentRequest(
      request.get("Authorization"),
      typeof request.body === "string" ? request.body : "",
      typeof clientUid === "string" && clientUid.length <= 200 ? clientUid : null,
    );
    sendEnrollment(request, response, enrollment);
  } catch (error: unknown) {
    if (error instanceof EnrollmentAuthenticationError) {
      response.set("WWW-Authenticate", 'Basic realm="OpenMeshTak TAK enrollment"').status(401).end();
    } else if (error instanceof CertificateRequestError) {
      response.status(400).type("text/plain").send(error.message);
    } else {
      logger.error({ error, event: "tak_enrollment_failed" }, "TAK enrollment failed");
      response.status(500).end();
    }
  }
}

/** The certificate a client presented, if the TLS layer verified it against a trusted CA. */
function verifiedPeerCertificate(request: Request): Buffer | undefined {
  const socket = request.socket as TLSSocket;
  return socket.authorized === true ? (socket.getPeerCertificate().raw) : undefined;
}

async function enrollmentProfile(request: Request, response: Response): Promise<void> {
  try {
    const userId = await authenticateProfileRequest(request.get("Authorization"), verifiedPeerCertificate(request));
    if (userId === null) {
      response.set("WWW-Authenticate", 'Basic realm="OpenMeshTak TAK enrollment"').status(401).end();
      return;
    }
    await sendDeviceProfile(response, userId, await takAccessFor(userId), "enrollment", null);
  } catch (error: unknown) {
    logger.error({ error, event: "tak_enrollment_profile_failed" }, "TAK enrollment profile failed");
    response.status(500).end();
  }
}

/**
 * The enrollment endpoints a TAK app calls on the enrollment port. They are served over TLS with
 * the TAK server certificate and authenticate with the single-use enrollment token, never with
 * the account password. Failed attempts are throttled per address.
 */
export function createEnrollmentApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  const failures = rateLimit({ windowMs: 15 * 60_000, limit: 20, skipSuccessfulRequests: true, standardHeaders: "draft-8", legacyHeaders: false });

  app.get("/Marti/api/tls/config", tlsConfig);
  app.post(
    "/Marti/api/tls/signClient/v2",
    failures,
    express.text({ type: () => true, limit: "16kb" }),
    (request, response) => void signClient(request, response),
  );
  app.get("/Marti/api/tls/profile/enrollment", (request, response) => void enrollmentProfile(request, response));
  app.use((_request, response) => {
    response.status(404).end();
  });
  return app;
}
