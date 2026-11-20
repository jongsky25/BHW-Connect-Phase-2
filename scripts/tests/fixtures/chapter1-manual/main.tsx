import React from 'react';
import {createRoot} from 'react-dom/client';
import {Chapter1ManualReference} from '../../../../src/components/elearning/chapter1-manual-reference';
import '../../../../src/app/globals.css';
const params = new URLSearchParams(location.search);
const locale = params.get('locale') ?? 'en';
document.documentElement.lang = locale;
createRoot(document.getElementById('app')!).render(<main className="mx-auto max-w-3xl p-4">
  <h1>Chapter 1 reference check</h1>
  <Chapter1ManualReference lessonKey={params.get('lesson') ?? 'safety-identify'} locale={locale}/>
</main>);
