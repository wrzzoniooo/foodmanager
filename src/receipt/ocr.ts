/** Przygotowuje zdjęcie paragonu do odczytu: odpowiednia wielkość, skala szarości i podbity kontrast. */
async function prepare(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const target = 1800;
  const scale = Math.min(2, target / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Brak obsługi canvas');
  ctx.filter = 'grayscale(1) contrast(1.35)';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/**
 * Odczytuje tekst z paragonu w telefonie (Tesseract, język polski): zdjęcie nigdzie nie jest wysyłane.
 * Przy pierwszym użyciu pobierana jest biblioteka i słownik, potem działają z pamięci telefonu.
 */
export async function readReceipt(file: File, onProgress: (fraction: number) => void): Promise<string> {
  const canvas = await prepare(file);
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker('pol', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress(m.progress);
    },
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN, preserve_interword_spaces: '1' });
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
