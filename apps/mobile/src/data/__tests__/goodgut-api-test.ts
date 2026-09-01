import { configuredBaseUrl, GoodGutClientError, lookupProduct } from '../goodgut-api';

const notFound = {
  contractVersion: '2.0',
  outcome: 'not_found',
  barcode: '12345678',
  source: { provider: 'open_food_facts' },
  reason: 'not_in_source',
};

describe('GoodGut API client', () => {
  it('normalizes configuration and calls only the configured GoodGut URL', async () => {
    const request = jest.fn(async () => new Response(JSON.stringify(notFound), { status: 200 }));

    await expect(
      lookupProduct('00001234', { baseUrl: ' http://api.example.test/ ', fetch: request }),
    ).resolves.toEqual(notFound);
    expect(request).toHaveBeenCalledWith(
      'http://api.example.test/products/00001234',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it.each([undefined, '', 'not a URL', 'ftp://example.com', 'https://user:pass@example.com'])(
    'rejects missing or unsafe configuration %p',
    (value) => {
      try {
        configuredBaseUrl(value);
        throw new Error('expected configuration failure');
      } catch (error) {
        expect(error).toMatchObject({ kind: 'missing_configuration' });
      }
    },
  );

  it('distinguishes transport, HTTP, and invalid response failures', async () => {
    await expect(
      lookupProduct('12345678', {
        baseUrl: 'http://api.test',
        fetch: async () => {
          throw new Error('offline');
        },
      }),
    ).rejects.toMatchObject({ kind: 'transport_failure' });

    await expect(
      lookupProduct('12345678', {
        baseUrl: 'http://api.test',
        fetch: async () => new Response('', { status: 503 }),
      }),
    ).rejects.toMatchObject({ kind: 'http_error', status: 503 });

    await expect(
      lookupProduct('12345678', {
        baseUrl: 'http://api.test',
        fetch: async () => new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
      }),
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('uses a typed client error', () => {
    expect(new GoodGutClientError('transport_failure', 'offline')).toBeInstanceOf(Error);
  });

  it('aborts a lookup after its configured deadline', async () => {
    jest.useFakeTimers();
    const request = jest.fn((_url: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }),
    );

    const lookup = lookupProduct('12345678', {
      baseUrl: 'http://api.test',
      fetch: request,
      timeoutMs: 25,
    });
    const rejected = expect(lookup).rejects.toMatchObject({ kind: 'transport_failure' });
    await jest.advanceTimersByTimeAsync(25);

    await rejected;
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
    jest.useRealTimers();
  });
});
