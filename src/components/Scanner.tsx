import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface DetectedBarcode {
  rawValue: string;
}
export interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

type Problem = 'engine' | 'insecure' | 'denied';

const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const;
export const QR_FORMATS = ['qr_code'] as const;

const PROBLEM_TEXT: Record<Problem, string> = {
  engine: 'Nie udało się uruchomić skanera. Wpisz kod ręcznie.',
  insecure: 'Aparat działa tylko przez bezpieczne połączenie (HTTPS). Wpisz kod ręcznie.',
  denied: 'Brak zgody na użycie aparatu. Zezwól w ustawieniach przeglądarki albo wpisz kod ręcznie.',
};

/**
 * Tworzy dekoder kodów. Gdy przeglądarka ma wbudowany BarcodeDetector (Chrome na Androidzie), używa go;
 * w pozostałych (iPhone, komputery) używa biblioteki opartej na ZXing, ładowanej dopiero przy skanowaniu.
 */
export async function createDetector(formats: readonly string[] = BARCODE_FORMATS): Promise<BarcodeDetectorLike> {
  const Native = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (Native) return new Native({ formats: [...formats] });
  const [lib, wasm] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('../../node_modules/zxing-wasm/dist/reader/zxing_reader.wasm?url'),
  ]);
  const wasmUrl = (wasm as { default: string }).default;
  lib.setZXingModuleOverrides({
    locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
  });
  return new lib.BarcodeDetector({ formats: [...formats] } as ConstructorParameters<typeof lib.BarcodeDetector>[0]) as unknown as BarcodeDetectorLike;
}

/** Skaner kodów kreskowych: widok z aparatu w oknie aplikacji. */
export function Scanner({
  onDetect,
  onManual,
  onBack,
  onClose,
  formats = BARCODE_FORMATS,
  hint = 'Skieruj aparat na kod kreskowy',
  manualLabel = 'Wpisz kod ręcznie',
}: {
  formats?: readonly string[];
  hint?: string;
  manualLabel?: string;
  onDetect: (code: string) => void;
  onManual: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectRef = useRef(onDetect);
  detectRef.current = onDetect;
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setProblem('insecure');
      return;
    }

    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;

    const stop = () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        let detector: BarcodeDetectorLike;
        try {
          detector = await createDetector(formats);
        } catch {
          if (!stopped) setProblem('engine');
          return;
        }
        const tick = async () => {
          if (stopped) return;
          try {
            const found = await detector.detect(video);
            if (found[0]?.rawValue) {
              stop();
              if (typeof navigator.vibrate === 'function') navigator.vibrate(60);
              detectRef.current(found[0].rawValue);
              return;
            }
          } catch {
            /* pojedyncza klatka bez wyniku: próbujemy dalej */
          }
          timer = window.setTimeout(tick, 200);
        };
        void tick();
      } catch {
        if (!stopped) setProblem('denied');
      }
    })();

    return stop;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onBack();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  return (
    <div className="scan" role="dialog" aria-modal="true" aria-label="Skanuj kod">
      {problem ? null : <video ref={videoRef} muted playsInline aria-label="Podgląd z aparatu" />}
      <div className="scan-top">
        <button type="button" className="scan-btn" aria-label="Wstecz" onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h2>Skanuj kod</h2>
        <button type="button" className="scan-btn" aria-label="Zamknij" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="scan-mid">
        {problem ? (
          <p className="scan-msg" role="alert">
            {PROBLEM_TEXT[problem]}
          </p>
        ) : (
          <>
            <p className="scan-hint">{hint}</p>
            <div className="scan-frame" aria-hidden="true">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              <span className="scan-line" />
            </div>
          </>
        )}
      </div>
      <div className="scan-bottom">
        <button type="button" className="btn wide" onClick={onManual}>
          {manualLabel}
        </button>
      </div>
    </div>
  );
}
