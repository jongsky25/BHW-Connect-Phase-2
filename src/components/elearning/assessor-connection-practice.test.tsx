import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {AssessorConnectionPractice} from './assessor-connection-practice';
afterEach(cleanup);
it.each(['en','fil'])('offers four safe exercises and role-correct navigation (%s)',locale=>{
 render(<AssessorConnectionPractice programId="program" locale={locale}/>);
 expect(screen.getAllByRole('listitem',{hidden:true})).toHaveLength(4);
 expect(screen.getByText(locale==='en'?'Open fictional simulation':'Buksan ang kathang-isip na simulation')).toHaveAttribute('href','/training/program/assessor/chapter-1/simulation');
 expect(screen.getByText(locale==='en'?'Open my test results':'Buksan ang aking mga resulta')).toHaveAttribute('href','/my-results');
 expect(screen.getByText(locale==='en'?/The page counts reconcile to 3/:/Tugma sa 3 ang bilang sa pahina/)).toBeInTheDocument();
 expect(screen.queryByRole('button')).toBeNull();
});
