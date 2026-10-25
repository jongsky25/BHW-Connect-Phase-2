import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import enMessages from '../../../messages/en.json';
import { ReferenceReadSection } from './reference-read-section';
import { LessonNarration } from './lesson-narration';
import { NARRATION_SPEED_KEY, enterNarrationScope, setNarrationSpeed } from '@/lib/elearning/narration-preferences';

const track = {src:'/training/audio/test/one.mp3',duration_seconds:10,timings:[
  {zone:'heading' as const,index:0,text:'Heading',start_ms:0,end_ms:1000},
  {zone:'body' as const,index:0,text:'Body.',start_ms:1000,end_ms:10000},
]};
function section(scope='lesson-one:en', narration:typeof track|undefined=track) {
  return <ReferenceReadSection heading="Heading" body="Body." takeaway="" narration={narration} en continuationScope={scope}/>;
}
beforeEach(()=>{
  localStorage.clear(); setNarrationSpeed(1); enterNarrationScope();
  vi.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(function(this:HTMLMediaElement){fireEvent.play(this);return Promise.resolve();});
  vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(function(this:HTMLMediaElement){fireEvent.pause(this);});
  vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();setNarrationSpeed(1);localStorage.clear();enterNarrationScope();});
function enable() {fireEvent.click(screen.getByRole('checkbox',{name:'Play next sections automatically'}));}
function play() {fireEvent.click(screen.getByRole('button',{name:'Listen'}));}

it('retains speed on a new section, new lesson, and legacy player without starting audio',()=>{
  let view=render(section());
  fireEvent.change(screen.getByLabelText('Speed'),{target:{value:'1.5'}});
  expect(view.container.querySelector('audio')!.playbackRate).toBe(1.5);
  expect(localStorage.getItem(NARRATION_SPEED_KEY)).toBe('1.5');
  for(const scope of ['lesson-one:en','lesson-two:fil']){
    view.unmount();view=render(section(scope));
    expect(screen.getByLabelText('Speed')).toHaveValue('1.5');
    expect(view.container.querySelector('audio')!.playbackRate).toBe(1.5);
  }
  view.unmount();view=render(<NextIntlClientProvider locale="en" messages={enMessages}><LessonNarration heading="Heading" body="Body." takeaway="" audio={{id:'a',module_id:'m',section_index:0,language:'en',audio_url:track.src,format:'mp3',duration_seconds:10,content_hash:'test',timings:track.timings}}/></NextIntlClientProvider>);
  expect(screen.getByLabelText('Speed')).toHaveValue('1.5');
  expect(view.container.querySelector('audio')!.playbackRate).toBe(1.5);
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
});
it.each(['invalid','3','0','null'])('ignores invalid stored speed %s',value=>{
  localStorage.setItem(NARRATION_SPEED_KEY,value);render(section());expect(screen.getByLabelText('Speed')).toHaveValue('1');
});
it('keeps speed usable when browser storage is blocked',()=>{
  vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('blocked');});
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('blocked');});
  const view=render(section());fireEvent.change(screen.getByLabelText('Speed'),{target:{value:'0.75'}});
  expect(view.container.querySelector('audio')!.playbackRate).toBe(.75);
  view.unmount();render(section('new-lesson'));expect(screen.getByLabelText('Speed')).toHaveValue('0.75');
});
it('updates mounted controls when another tab changes speed',()=>{
  const view=render(section());localStorage.setItem(NARRATION_SPEED_KEY,'1.25');fireEvent(window,new Event('storage'));
  expect(screen.getByLabelText('Speed')).toHaveValue('1.25');expect(view.container.querySelector('audio')!.playbackRate).toBe(1.25);
});
it('does not start audio by default, by selecting speed, or by enabling continuation alone',()=>{
  render(section());fireEvent.change(screen.getByLabelText('Speed'),{target:{value:'1.25'}});enable();
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
});
it('continues after manual navigation, keeping rate and stopping the old player',()=>{
  const view=render(section());enable();play();
  const audio=view.container.querySelector('audio')!;Object.defineProperty(audio,'paused',{value:false});
  fireEvent.change(screen.getByLabelText('Speed'),{target:{value:'1.5'}});view.unmount();
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();
  const next=render(section());expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
  expect(next.container.querySelector('audio')!.playbackRate).toBe(1.5);
});
it('keeps continuation after a clip finishes, but never advances a page or writes completion',()=>{
  let view=render(section());enable();play();
  const audio=view.container.querySelector('audio')!;Object.defineProperty(audio,'ended',{value:true});fireEvent.pause(audio);fireEvent.ended(audio);
  expect(screen.getByRole('button',{name:'Listen'})).toBeVisible();
  view.unmount();view=render(section());expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});
it.each(['pause','disable'])('respects %s on the next section',action=>{
  let view=render(section());enable();play();
  if(action==='pause')fireEvent.click(screen.getByRole('button',{name:'Pause'}));else enable();
  view.unmount();view=render(section());expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
});
it.each(['other-lesson:en','lesson-one:fil',''])('does not continue into a different lesson, language, or Slides scope (%s)',scope=>{
  let view=render(section());enable();play();view.unmount();view=render(section(scope));
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);view.unmount();render(section());
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
});
it('does not play a hidden check summary when responding unlocks its audio',()=>{
  const first=render(section());enable();play();first.unmount();
  const locked=render(<ReferenceReadSection heading="Heading" body="Body." takeaway="" en continuationScope="lesson-one:en"/>);
  const before=vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;
  locked.rerender(section());expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(before);
});
it('reports browser playback refusal and stops automatic retries on subsequent sections',async()=>{
  const view=render(section());enable();play();view.unmount();
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(Error('NotAllowedError'));
  let next:ReturnType<typeof render>;
  await act(async()=>{next=render(section());});
  expect(screen.getByRole('status')).toHaveTextContent('Audio could not play');
  next!.unmount();render(section());expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});
it('never renders playback controls or starts stale audio',()=>{
  const first=render(section());enable();play();first.unmount();
  render(<ReferenceReadSection heading="Changed" body="Body." takeaway="" narration={track} en continuationScope="lesson-one:en"/>);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
});
