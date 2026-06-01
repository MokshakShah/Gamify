import pdf from 'pdf-parse';

function normalizePdfText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractPdfText(
  data: ArrayBuffer | Buffer
): Promise<string> {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const result = await pdf(buffer);
  const text = normalizePdfText(result.text ?? '');
  if (!text) {
    throw new Error('No extractable text found in PDF.');
  }
  return text;
}
