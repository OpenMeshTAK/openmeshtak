/**
 * Opaque resource identifier. The pattern makes tsoa reject malformed IDs before they reach a
 * database query.
 * @format uuid
 * @pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
 */
export type Uuid = string;
