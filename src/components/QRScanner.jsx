"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, RotateCcw, Scan, Power } from "lucide-react";
import { Button } from "./ui/button";

export default function QRScanner({ onScan, onClose }) {
  const scannedRef = useRef(false);
  const isInitializingRef = useRef(false);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const scannerInstanceRef = useRef(null);
  const isMounted = useRef(true);

  const shutdownScanner = async () => {
    try {
      if (scannerInstanceRef.current) {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop();
        }
        scannerInstanceRef.current = null;
      }

      const container = document.getElementById("qr-reader-container");
      if (container) {
        const videos = container.querySelectorAll("video");
        videos.forEach((video) => {
          if (video.srcObject) {
            video.srcObject.getTracks().forEach((track) => track.stop());
            video.srcObject = null;
          }
          video.pause();
          video.removeAttribute("src");
          video.load();
        });
      }
      setScanning(false);
    } catch (err) {
      console.error("❌ Error apagando escáner:", err);
    }
  };

  useEffect(() => {
    isMounted.current = true;

    const initScanner = async () => {
      if (!isMounted.current) return;
      if (isInitializingRef.current) return;

      isInitializingRef.current = true;

      try {
        setScanning(false);
        setError(null);

        const container = document.getElementById("qr-reader-container");
        if (container) {
          container.innerHTML = "";
        }

        const html5QrCode = new Html5Qrcode("qr-reader-container");
        scannerInstanceRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: cameraFacing },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (scannedRef.current) return;
            scannedRef.current = true;

            setScanSuccess(true);
            shutdownScanner().then(() => {
              if (isMounted.current) onScan(decodedText);
            });
          },
        );

        if (isMounted.current) setScanning(true);
      } catch (err) {
        console.error(err);
        setError("No se pudo acceder a la cámara.");
      } finally {
        isInitializingRef.current = false;
      }
    };

    initScanner();

    return () => {
      isMounted.current = false;
      shutdownScanner();
    };
  }, [cameraFacing]);

  const handleSwitchCamera = async () => {
    if (isInitializingRef.current) return;
    setScanning(false);
    await shutdownScanner();
    setTimeout(() => {
      if (isMounted.current) {
        setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
      }
    }, 400);
  };

  const handleManualClose = async () => {
    await shutdownScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-0 md:p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-white md:rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
        <div className="flex justify-between items-center p-4 border-b bg-white">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Scan className="w-5 h-5 text-indigo-600" />
            Escanear QR
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={handleSwitchCamera}
              variant="outline"
              size="sm"
              className="hidden md:flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Girar
            </Button>
            <Button
              onClick={handleManualClose}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
            >
              <Power className="w-4 h-4" />
              Cerrar
            </Button>
          </div>
        </div>

        <div className="relative bg-slate-900 aspect-square md:aspect-auto md:min-h-[400px]">
          <div id="qr-reader-container" className="w-full h-full" />
          <div className="md:hidden absolute top-4 right-3 flex gap-3 z-20">
            <Button
              onClick={handleSwitchCamera}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg opacity-90 hover:bg-white hover:text-slate-700"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Cambiar
            </Button>
            <Button
              onClick={handleManualClose}
              className="px-3 py-2 bg-red-600 text-white rounded-lg opacity-90 hover:bg-white hover:text-red-600"
            >
              <Power className="w-4 h-4 mr-1" />
              Apagar
            </Button>
          </div>

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
              <Camera className="w-16 h-16 text-red-500 mb-4" />
              <p className="text-white font-medium">{error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Reintentar
              </Button>
            </div>
          )}

          {!scanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white text-sm">Iniciando cámara...</p>
            </div>
          )}

          {scanSuccess && (
            <div className="absolute inset-0 bg-green-600/80 flex items-center justify-center z-30 animate-fade-in">
              <div className="text-center text-white">
                <div className="bg-white rounded-full p-4 mb-3 inline-block">
                  <Scan className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-xl font-bold">¡Código Leído!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        #qr-reader-container video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        #qr-reader-container {
          border: none !important;
        }
        #qr-reader-container__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
