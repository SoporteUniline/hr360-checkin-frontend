"use client";

import { useEffect } from 'react';

export default function RetireOfflineWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const retire = async () => {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const worker = registration?.active || registration?.waiting || registration?.installing;
      if (worker && new URL(worker.scriptURL).pathname === '/offline-clock-sw.js') {
        await registration.update();
      }
    };
    const update = () => { void retire().catch(() => {}); };
    update();
    window.addEventListener('online', update);
    return () => window.removeEventListener('online', update);
  }, []);
  return null;
}
