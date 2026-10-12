interface TranscriptBoxProps {
  text: string;
  onChange: (text: string) => void;
  disabled?: boolean;
}

export function TranscriptBox({ text, onChange, disabled }: TranscriptBoxProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="consultation-transcript" className="font-medium text-gray-800">Observations et transcription</label>
      <textarea
        id="consultation-transcript"
        value={text}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={10}
        className="w-full p-3 border border-gray-300 rounded-lg focus:border-brand-blue outline-none leading-relaxed"
        placeholder="Saisissez ou dictez les observations…"
      />
      <p className="text-xs text-gray-500">Vous pouvez corriger le texte à tout moment. Les résultats provisoires de la dictée ne sont pas sauvegardés.</p>
    </div>
  );
}
