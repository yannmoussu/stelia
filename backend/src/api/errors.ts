export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = () => new AppError(404, 'NOT_FOUND', 'Consultation introuvable.');
export const conflict = () => new AppError(409, 'REVISION_CONFLICT', 'Le dossier a été modifié. Rechargez sa version actuelle.');
