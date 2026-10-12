import {
  ConsultationSchema, ConsultationSummarySchema,
  type CreateConsultationInput, type UpdateConsultationInput, type SaveTranscriptInput, type ReviewInput,
} from '@stelia/contracts';
import { z } from 'zod';
import { request, requestWithoutResponse } from './http';

const consultationPath = (id: string) => `/consultations/${encodeURIComponent(id)}`;

export const consultationService = {
  getConsultations: (signal?: AbortSignal) => request('/consultations', z.array(ConsultationSummarySchema), { signal }),
  getConsultation: (id: string, signal?: AbortSignal) => request(consultationPath(id), ConsultationSchema, { signal }),
  createConsultation: (data: CreateConsultationInput, signal?: AbortSignal) => request('/consultations', ConsultationSchema, { method: 'POST', body: JSON.stringify(data), signal }),
  updateConsultation: (id: string, data: UpdateConsultationInput, signal?: AbortSignal) => request(consultationPath(id), ConsultationSchema, { method: 'PATCH', body: JSON.stringify(data), signal }),
  saveTranscript: (id: string, data: SaveTranscriptInput, signal?: AbortSignal) => request(`${consultationPath(id)}/transcript`, ConsultationSchema, { method: 'POST', body: JSON.stringify(data), signal }),
  structure: (id: string, expectedRevision: number, signal?: AbortSignal) => request(`${consultationPath(id)}/structure`, ConsultationSchema, { method: 'POST', body: JSON.stringify({ expectedRevision }), signal, timeoutMs: 120_000 }),
  review: (id: string, data: ReviewInput, signal?: AbortSignal) => request(`${consultationPath(id)}/review`, ConsultationSchema, { method: 'POST', body: JSON.stringify(data), signal }),
  deleteConsultation: (id: string, expectedRevision: number, signal?: AbortSignal) => requestWithoutResponse(consultationPath(id), { method: 'DELETE', body: JSON.stringify({ expectedRevision }), headers: { 'Content-Type': 'application/json' }, signal }),
};
