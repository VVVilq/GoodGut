import { LatestRequestGuard } from '../latest-request-guard';

describe('LatestRequestGuard', () => {
  it('allows only the newest request to commit', () => {
    const guard = new LatestRequestGuard();
    const first = guard.begin();
    const second = guard.begin();

    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });

  it('invalidates an outstanding request during cleanup', () => {
    const guard = new LatestRequestGuard();
    const request = guard.begin();

    guard.invalidate();

    expect(request()).toBe(false);
  });
});
