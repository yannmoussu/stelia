/** Minimal browser-independent contract, also usable by a native speech adapter. */
export interface RecognitionAlternative { readonly transcript: string }
export interface RecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: RecognitionAlternative | undefined;
}
export interface RecognitionResults {
  readonly length: number;
  readonly [index: number]: RecognitionResult | undefined;
}
export interface RecognitionResultEvent {
  readonly resultIndex: number;
  readonly results: RecognitionResults;
}
export interface RecognitionErrorEvent { readonly error: string }
export interface RecognitionAdapter {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type RecognitionFactory = () => RecognitionAdapter;
interface SpeechWindow extends Window {
  SpeechRecognition?: new () => RecognitionAdapter;
  webkitSpeechRecognition?: new () => RecognitionAdapter;
}

/** Resolve at runtime so importing this module never requires a browser. */
export function getBrowserRecognitionFactory(): RecognitionFactory | null {
  if (typeof window === 'undefined') return null;
  const browser = window as SpeechWindow;
  const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  return Constructor ? () => new Constructor() : null;
}

export function speechErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
    case 'NotAllowedError':
    case 'SecurityError':
      return "L'accès au microphone a été refusé. Autorisez-le dans les paramètres du navigateur.";
    case 'audio-capture':
      return 'Aucun microphone disponible. Vérifiez sa connexion et ses autorisations.';
    case 'no-speech':
      return 'Aucune parole détectée. Vous pouvez relancer la dictée ou saisir le texte.';
    case 'network':
      return 'Le service de transcription est indisponible. Vérifiez votre connexion et réessayez.';
    case 'language-not-supported':
      return 'La dictée en français est indisponible dans ce navigateur.';
    case 'aborted':
      return 'La dictée a été interrompue. Vous pouvez la relancer.';
    default:
      return 'La dictée a rencontré une erreur. Vous pouvez réessayer ou saisir le texte.';
  }
}
