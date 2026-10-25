'use client';

import {useLocale} from 'next-intl';

export default function TrainingLoading() {
  const en = useLocale() === 'en';
  return <div role="status" aria-live="polite" className="mx-auto w-full max-w-3xl space-y-2 px-4 py-10 sm:px-6">
    <p className="text-lg font-semibold">{en ? 'Loading training…' : 'Binubuksan ang pagsasanay…'}</p>
    <p>{en ? 'This may take longer on a slow connection. Wait for the page to finish loading.'
      : 'Maaaring mas matagal ito kapag mabagal ang koneksyon. Hintaying matapos ang pagbukas ng pahina.'}</p>
  </div>;
}
