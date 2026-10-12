import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyMedicalReport } from '@stelia/contracts';
import { HttpAIService } from '../src/services/ai.service.js';

afterEach(() => { vi.unstubAllGlobals(); });

describe('Explicit HTTP JSON AI adapter', () => {
  it('transmits only the transcript/model/schema contract and returns untrusted medical JSON', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(createEmptyMedicalReport()), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const service = new HttpAIService('https://ai.example/structure', 'secret-key', 'configured-model');
    expect(await service.structureTranscript('Saved transcript')).toEqual(createEmptyMedicalReport());
    const [endpoint, options] = fetch.mock.calls[0]!;
    expect(endpoint).toBe('https://ai.example/structure');
    const request = options as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body).toMatchObject({ transcript: 'Saved transcript', model: 'configured-model' });
    expect(body.schema).toHaveProperty('properties.conclusion');
    expect(request.redirect).toBe('error');
    expect(request.signal).toBeInstanceOf(AbortSignal);
  });

  it('refuses insecure remote endpoints and embedded credentials', () => {
    for (const endpoint of [
      'http://ai.example/report', 'https://user:secret@ai.example/report', 'https://ai.example/report#secret',
    ]) expect(() => new HttpAIService(endpoint, 'token', 'model')).toThrow();
    expect(() => new HttpAIService('http://127.0.0.1:9090/report', 'token', 'model')).not.toThrow();
  });

  it('bounds streamed bytes before JSON parsing', async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(1_000_001)); },
      cancel() { cancelled = true; },
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream)));
    const service = new HttpAIService('https://ai.example/report', 'token', 'model');
    await expect(service.structureTranscript('Words')).rejects.toMatchObject({ statusCode: 502, code: 'AI_INVALID_RESPONSE' });
    expect(cancelled).toBe(true);
  });

  it('handles malformed JSON, HTTP failures and timeouts without exposing provider content', async () => {
    const service = new HttpAIService('https://ai.example/report', 'token', 'model', 100);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('private provider output')));
    await expect(service.structureTranscript('Words')).rejects.toMatchObject({ code: 'AI_UNAVAILABLE', statusCode: 502 });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('private provider output', { status: 500 })));
    await expect(service.structureTranscript('Words')).rejects.toMatchObject({ code: 'AI_UNAVAILABLE', statusCode: 502 });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('private timeout context', 'TimeoutError'); }));
    await expect(service.structureTranscript('Words')).rejects.toMatchObject({ code: 'AI_TIMEOUT', statusCode: 504 });
  });
});
