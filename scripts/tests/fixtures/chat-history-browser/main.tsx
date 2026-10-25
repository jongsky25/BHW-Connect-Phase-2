import {createRoot} from 'react-dom/client';
import {NextIntlClientProvider} from 'next-intl';
import {ChatGuide} from '../../../../src/components/chat/chat-guide';
import en from '../../../../messages/en.json';
import fil from '../../../../messages/fil.json';
import '../../../../src/app/globals.css';
const query = new URLSearchParams(location.search);
const lang = query.get('lang') === 'fil' ? 'fil' : 'en';
document.documentElement.lang = lang;
document.documentElement.dataset.fontScale = 'xl';
document.documentElement.dataset.theme = query.get('theme') || 'light';
createRoot(document.getElementById('app')!).render(<NextIntlClientProvider locale={lang} messages={lang === 'en' ? en : fil}>
  <main className="mx-auto flex w-full max-w-4xl flex-col px-4 py-6 sm:px-6"><h1>Chat Guide</h1><ChatGuide/></main>
</NextIntlClientProvider>);
