// Runs every test file: `node tests/run.mjs`. Plain node, no dependencies; the harness
// is the studio kit's (src/kit/test/harness.js).
import { report } from '../src/kit/test/harness.js';
import './save.test.mjs';
import './resume.test.mjs';
import './kit.test.mjs';
await report();
