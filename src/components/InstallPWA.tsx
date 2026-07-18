"use client";

import { useEffect, useState } from "react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.error("Service Worker registration failed: ", err);
        });
      });
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    if (isIOSDevice && !isStandalone) {
      setIsIOS(true);
      setShowInstall(true);
    }

    // Listen for install prompt (Android/Desktop Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if it already fired before React hydrated
    const checkPrompt = setInterval(() => {
      if ((window as any).__deferredPrompt) {
        setDeferredPrompt((window as any).__deferredPrompt);
        setShowInstall(true);
        clearInterval(checkPrompt);
      }
    }, 500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearInterval(checkPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert("To install on iPhone/iPad:\n1. Tap the Share button at the bottom of Safari (the square with an arrow pointing up)\n2. Scroll down and tap 'Add to Home Screen'");
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <button 
        onClick={handleInstallClick}
        className="bg-primary text-white font-semibold py-3 px-6 rounded-full shadow-lg shadow-primary/30 flex items-center gap-2 hover:bg-primary/90 transition-colors border border-white/10 whitespace-nowrap"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        {isIOS ? "Install on iOS" : "Install App"}
      </button>
    </div>
  );
}
