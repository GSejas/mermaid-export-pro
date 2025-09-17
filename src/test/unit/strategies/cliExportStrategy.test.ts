import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import sinon from 'sinon';
import { CLIExportStrategy } from '../../../strategies/cliExportStrategy';

describe('CLIExportStrategy', () => {
  let strategy: CLIExportStrategy;

  beforeEach(() => {
    strategy = new CLIExportStrategy();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('getRequiredDependencies returns expected package', () => {
    expect(strategy.getRequiredDependencies()).toEqual(['@mermaid-js/mermaid-cli']);
  });

  it('isAvailable returns true when executeCli resolves', async () => {
    const stub = sinon.stub(strategy as any, 'executeCli').resolves(Buffer.from('v1.2.3'));
    const available = await strategy.isAvailable();
    expect(available).toBe(true);
    sinon.assert.calledOnce(stub);
  });

  it('isAvailable returns false when executeCli rejects', async () => {
    sinon.stub(strategy as any, 'executeCli').rejects(new Error('ENOENT'));
    const available = await strategy.isAvailable();
    expect(available).toBe(false);
  });

  it('getVersion returns trimmed version string', async () => {
    sinon.stub(strategy as any, 'executeCli').resolves(Buffer.from('  1.2.3\n'));
    const version = await strategy.getVersion();
    expect(version).toBe('1.2.3');
  });

  it('testCli returns false when export throws', async () => {
    sinon.stub(strategy as any, 'export').rejects(new Error('export failed'));
    const res = await strategy.testCli();
    expect(res).toBe(false);
  });
});
