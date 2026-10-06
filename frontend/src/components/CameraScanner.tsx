import React, { useEffect, useRef, useState } from 'react';

interface CameraScannerProps {
  enabled: boolean;
  onScan: (value: string) => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ enabled, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [retryKey, setRetryKey] = useState(0);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    let stopped = false;
    let lastValue = '';
    let lastScannedAt = 0;
    let controls: { stop: () => void } | undefined;
    setCameraError('');
    void import('@zxing/browser').then(({ BrowserMultiFormatReader }) => {
      if (stopped || !videoRef.current) return;
      const reader = new BrowserMultiFormatReader();
      return reader.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
        if (stopped) return;
        if (result) {
          const value = result.getText().trim();
          const now = Date.now();
          if (value && (value !== lastValue || now - lastScannedAt > 1800)) {
            lastValue = value;
            lastScannedAt = now;
            onScanRef.current(value);
          }
        } else if (error && !['NotFoundException', 'ChecksumException', 'FormatException'].includes(error.name)) {
          setCameraError(error.message || 'Camera scan failed. Check camera access and try again.');
        }
      });
    }).then((startedControls) => {
      if (!startedControls) return;
      controls = startedControls;
      if (stopped) controls.stop();
    }).catch((error: unknown) => {
      if (stopped) return;
      const message = error instanceof Error ? error.message : '';
      setCameraError(message || 'Camera unavailable. Allow camera access or enter the code manually.');
    });

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [enabled, retryKey]);

  if (!enabled) return null;

  return (
    <div className="camera-scanner">
      <video ref={videoRef} muted playsInline aria-label="Live barcode and QR scanner" />
      {cameraError && (
        <div className="alert alert-error" role="alert">
          {cameraError}
          <button type="button" className="button button-primary" onClick={() => setRetryKey((key) => key + 1)}>
            Retry camera
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraScanner;
