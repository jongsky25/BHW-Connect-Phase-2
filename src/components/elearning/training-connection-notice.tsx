'use client';

import {useEffect, useState, useSyncExternalStore} from 'react';

function subscribe(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {window.removeEventListener('online', listener); window.removeEventListener('offline', listener);};
}
const onlineSnapshot = () => navigator.onLine;
const serverSnapshot = () => true;

/** Browser connectivity is advisory; only a successful server receipt confirms a save. */
export function TrainingConnectionNotice({locale, assessment = false, readOnly = false}: {
  locale: string; assessment?: boolean; readOnly?: boolean;
}) {
  const online = useSyncExternalStore(subscribe, onlineSnapshot, serverSnapshot);
  const [showRestored, setShowRestored] = useState(false);
  const connection = !online ? 'offline' : showRestored ? 'restored' : 'online';
  const en = locale === 'en';
  useEffect(() => {
    const restored = () => setShowRestored(true);
    window.addEventListener('online', restored);
    return () => window.removeEventListener('online', restored);
  }, []);
  if (connection === 'online') return null;
  return <aside role="status" aria-live="polite" aria-label={en ? 'Connection status' : 'Kalagayan ng koneksyon'}
    lang={en ? 'en' : 'fil'} className="space-y-2 rounded-lg border border-ink/25 bg-canvas p-4 text-ink">
    <p className="font-semibold">{connection === 'offline'
      ? (en ? 'You appear to be offline. Keep this page open.' : 'Mukhang walang koneksyon. Panatilihing bukas ang pahinang ito.')
      : (en ? 'Your connection may be back.' : 'Maaaring bumalik na ang koneksyon.')}</p>
    <p>{assessment
      ? (en ? 'Wait for Saved before leaving. If a change or submission failed, reconnect and retry it. Do not reload while a response is marked Unsaved.'
        : 'Hintaying lumabas ang Naka-save bago umalis. Kung nabigo ang pagbabago o pagsusumite, kumonekta muli at subukan ulit. Huwag mag-reload habang may sagot na Hindi pa naka-save.')
      : (en ? 'Text already loaded may remain readable. New pages, pictures, audio and video may need a connection.'
        : 'Maaaring mabasa pa ang nakabukas nang teksto. Maaaring kailangan ng koneksyon ang bagong pahina, larawan, audio at video.')}</p>
    {!assessment && !readOnly && <p>{en
      ? 'After reconnecting, retry any failed position or completion save before leaving. Offline changes are not queued for later saving.'
      : 'Pagkabalik ng koneksyon, subukang muli ang nabigong pag-save ng puwesto o pagkumpleto bago umalis. Hindi nakapila para sa pag-save sa ibang oras ang mga pagbabagong offline.'}</p>}
    {connection === 'restored' && <button type="button" className="min-h-11 rounded border border-ink/25 px-3 py-2 underline"
      onClick={() => setShowRestored(false)}>{en ? 'Dismiss connection message' : 'Isara ang mensahe ng koneksyon'}</button>}
  </aside>;
}
