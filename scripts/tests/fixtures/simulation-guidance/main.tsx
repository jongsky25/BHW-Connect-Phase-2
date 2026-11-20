import {createRoot} from 'react-dom/client';
import {AssessorSimulationRunner} from '../../../../src/components/elearning/assessor-simulation-runner';
import {simulationContract, type SimulationState} from '../../../../src/lib/assessor/simulation-runner';
import '../../../../src/app/globals.css';
const params = new URLSearchParams(location.search);
const locale = params.get('locale') ?? 'en';
document.documentElement.lang = locale;
document.documentElement.dataset.theme = params.get('theme') ?? 'light';
if (params.has('large')) document.documentElement.style.fontSize = '200%';
const initial: SimulationState = {actorId:'fictional', programInstanceId:'fixture', programKey:'bhw-reference-manual',
  chapterKey:'chapter-1', requirementsVersion:simulationContract.requirementsVersion, scenarioId:simulationContract.id,
  version:simulationContract.version, revision:0, next:Number(params.get('next') ?? 3), viewStep:0,
  facts:[], note:'', attempts:{}, receipt:null};
createRoot(document.getElementById('app')!).render(<main><AssessorSimulationRunner initial={initial} locale={locale} chapterHref="/preparation" workspaceHref="/workspace"/></main>);
