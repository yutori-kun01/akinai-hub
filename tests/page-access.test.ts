import {test} from 'node:test';
import assert from 'node:assert/strict';
test('Custom CSS cannot close the style element or load external resources',async()=>{const {safeCss}=await import('../lib/page-access-css.ts');assert.equal(safeCss('h1{color:red}</style><script>alert(1)</script>'),'h1{color:red}/style>script>alert(1)/script>');assert.ok(!safeCss('@import "https://evil.test/x.css";a{b:c}').includes('@import'));assert.ok(!/url\s*\(/i.test(safeCss('a{background:URL (https://evil.test/p.png)}')));});
