import { afterEach, describe, expect, it, vi } from 'vitest';
import { consultationService } from './consultationService';
import { ApiError, request } from './http';
import { ConsultationSchema } from '@stelia/contracts';
import { waitFor } from '@testing-library/react';
import { consultationFixture, deferred } from '../test/fixtures';

afterEach(() => vi.unstubAllGlobals());
describe('validated HTTP boundary', () => {
  it('uses same-origin API and cookie credentials with abort propagation', async () => {
    const controller = new AbortController();
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(consultationFixture()))); vi.stubGlobal('fetch', fetch);
    const result = await consultationService.getConsultation(consultationFixture().id, controller.signal);
    expect(result.patient.nom).toBe('Martin');
    expect(fetch).toHaveBeenCalledWith(`/api/consultations/${result.id}`, expect.objectContaining({ credentials: 'include', signal: expect.any(AbortSignal) }));
  });
  it('rejects invalid responses instead of passing untyped data to pages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'invalid', patient: null }))));
    await expect(consultationService.getConsultation(consultationFixture().id)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('bounds a stalled response body by the request timeout', async () => {
    const response = new Response();
    vi.spyOn(response, 'json').mockReturnValue(deferred<unknown>().promise);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(request('/consultations', ConsultationSchema, { timeoutMs: 20 })).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
  it('allows caller cancellation after headers arrive while the body remains pending', async () => {
    const response = new Response(); const json = vi.spyOn(response, 'json').mockReturnValue(deferred<unknown>().promise);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const controller = new AbortController();
    const pending = request('/consultations', ConsultationSchema, { signal: controller.signal });
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await waitFor(() => expect(json).toHaveBeenCalled());
    controller.abort(); await rejected;
  });
  it('keeps 404 distinct from connection errors and rejects failed saves', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Consultation introuvable' } }), { status: 404 })));
    await expect(consultationService.saveTranscript(consultationFixture().id, { expectedRevision: 1, transcript: 'A' })).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(consultationService.getConsultations()).rejects.toBeInstanceOf(ApiError);
    await expect(consultationService.getConsultations()).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
