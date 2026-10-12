import { hashPassword } from './password.js';

async function readPassword(): Promise<string> {
  if (!process.stdin.isTTY) {
    let value = '';
    for await (const chunk of process.stdin) {
      value += String(chunk);
      if (value.length > 1_026) throw new Error('Le mot de passe ne peut pas dépasser 1024 caractères.');
    }
    return value.replace(/\r?\n$/, '');
  }
  process.stderr.write('Mot de passe (12 caractères minimum, saisie masquée) : ');
  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.resume();
  try {
    return await new Promise<string>((resolve, reject) => {
      let value = '';
      const onData = (chunk: string) => {
        for (const character of chunk) {
          if (character === '\u0003' || character === '\u0004') {
            cleanup();
            reject(new Error('Saisie annulée.'));
            return;
          }
          if (character === '\r' || character === '\n') {
            cleanup();
            resolve(value);
            return;
          }
          if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
          else if (character >= ' ') value += character;
          if (value.length > 1_024) {
            cleanup();
            reject(new Error('Le mot de passe ne peut pas dépasser 1024 caractères.'));
            return;
          }
        }
      };
      const cleanup = () => { process.stdin.off('data', onData); };
      process.stdin.on('data', onData);
    });
  } finally {
    process.stdin.setRawMode(wasRaw);
    process.stdin.pause();
    process.stderr.write('\n');
  }
}

try {
  const password = await readPassword();
  if (password.length > 1_024) throw new Error('Le mot de passe ne peut pas dépasser 1024 caractères.');
  process.stdout.write(`${await hashPassword(password)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Impossible de créer le hash.'}\n`);
  process.exitCode = 1;
}
