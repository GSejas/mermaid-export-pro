// Expose mocha-style globals used in existing tests (suite/test/setup/teardown)
import { describe as suite, it as test, beforeEach as setup, afterEach as teardown, beforeAll, afterAll } from 'vitest';
(global as any).suite = suite;
(global as any).test = test;
(global as any).setup = setup;
(global as any).teardown = teardown;
(global as any).beforeAll = beforeAll;
(global as any).afterAll = afterAll;
