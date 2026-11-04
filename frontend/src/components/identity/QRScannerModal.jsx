import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, AlertCircle, Keyboard } from "lucide-react";

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [manualInput, setManualInput] = useState("");
  const [scannerError, setScannerError] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const qrRegionId = "qr-reader-region";
    let isMounted = true;

    async function startScanner() {
      try {
        setScannerError(null);
        const html5QrCode = new Html5Qrcode(qrRegionId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (isMounted) {
              stopScanner();
              onScanSuccess(decodedText);
            }
          },
          () => {
            // Scanning in progress...
          }
        );
      } catch (err) {
        console.warn("Camera start failed:", err);
        if (isMounted) {
          setScannerError(
            "Could not access camera. Please allow camera permissions or enter the credential ID manually below."
          );
        }
      }
    }

    // Give DOM time to render div
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error("Failed to stop QR scanner:", err);
      }
      html5QrCodeRef.current = null;
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    stopScanner();
    onScanSuccess(manualInput.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-surface rounded-card max-w-md w-full p-6 shadow-xl border border-borderSoft relative animate-in fade-in zoom-in duration-150">
        <button
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary p-1.5 rounded-btn hover:bg-gray-100 transition-colors"
          title="Close scanner"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-5 h-5 text-forest" />
          <h3 className="text-lg font-bold text-textPrimary">Scan Credential QR Code</h3>
        </div>

        {scannerError ? (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-btn flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{scannerError}</span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-btn border border-borderSoft bg-black/5 mb-4 relative min-h-[260px] flex items-center justify-center">
            <div id="qr-reader-region" className="w-full h-full"></div>
          </div>
        )}

        <div className="pt-2 border-t border-borderSoft">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-textSecondary">
              <Keyboard className="w-3.5 h-3.5" />
              Or paste Credential ID / Verification URL:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="0x... or http://localhost:5173/verify/..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-btn border border-borderSoft bg-bgMain focus:outline-none focus:ring-1 focus:ring-forest font-mono"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="px-4 py-2 bg-forest text-white text-xs font-semibold rounded-btn hover:bg-forest-hover disabled:opacity-50 transition-colors"
              >
                Verify
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
