/**
 * Express "trust proxy" value for TRUST_PROXY. `true` would make Express take the leftmost
 * X-Forwarded-For entry, which the client controls whenever the proxy appends to the header
 * (nginx `$proxy_add_x_forwarded_for`), so anyone could pick a fresh address per request and
 * escape the rate limits. Trusting exactly one hop takes the address the reverse proxy itself
 * added. The Docker port mapping in between does not add an entry.
 */
export function trustProxySetting(trustProxy: boolean): number | false {
  return trustProxy ? 1 : false;
}
