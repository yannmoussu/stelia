import { writeFile } from 'node:fs/promises';
import { medicalReportJsonSchema } from '../dist/index.js';

// Export from the canonical schema for clients that do not use TypeScript.
await writeFile(new URL('../dist/medical-report.schema.json', import.meta.url), `${JSON.stringify(medicalReportJsonSchema, null, 2)}\n`);
