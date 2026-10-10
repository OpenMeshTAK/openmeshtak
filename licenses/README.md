# Third-party license texts

License texts that a dependency requires us to ship but that its npm package does not contain.
`scripts/write-release-notices.ts` adds them to the release notices.

| File | Package | Why it is here |
| --- | --- | --- |
| `JSTS-EDL-1.0.txt` | `jsts` and `@turf/jsts`, pulled in by `@turf/buffer` (corridors and safety distances) | Dual-licensed EDL-1.0 or EPL-1.0; we use EDL-1.0, which requires its text with every redistribution. The npm packages declare the license but include no license file. |
