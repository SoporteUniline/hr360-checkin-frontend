"use client";

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useAuth } from '@/context/AuthContext';
import { clockStore } from '@/lib/offline-clock';
import { selectLocalClockEvents } from '@/lib/local-clock-events.mjs';

export default function useLocalClockEvents({ company, from, to, search } = {}) {
  const { dataUser, isLoggedIn } = useAuth();
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const refresh = async () => {
      const current = ++revision;
      if (!isLoggedIn || !dataUser) { setSnapshot(null); return; }
      const store = await clockStore();
      const token = Cookies.get('token');
      const session = token && await store.fingerprint(token);
      const events = await store.listEvents();
      if (active && current === revision && token === Cookies.get('token')) setSnapshot({ user: dataUser, events, session });
    };
    const update = () => { void refresh().catch(() => { if (active) setSnapshot(null); }); };
    const visible = () => { if (!document.hidden) update(); };
    update();
    window.addEventListener('adamia-queue', update);
    window.addEventListener('online', update);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false;
      window.removeEventListener('adamia-queue', update);
      window.removeEventListener('online', update);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [dataUser, isLoggedIn]);
  if (!isLoggedIn || !snapshot || snapshot.user !== dataUser) return [];
  return selectLocalClockEvents(snapshot.events, { user: dataUser, session: snapshot.session, company, from, to, search });
}
