// Expose mocha-style globals used in existing tests (suite/test/setup/teardown)
import { describe as suite, it as test, beforeEach as setup, afterEach as teardown } from 'vitest';
(global as any).suite = suite;
(global as any).test = test;
(global as any).setup = setup;
(global as any).teardown = teardown;
