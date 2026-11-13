import React from 'react';
import {ArrowUpRight,Check,Download} from 'lucide-react';
import Character from './Character';
import {DesktopWindow} from './DesktopHero';

const steps=[
  ['Pick your buddy','Six original companions. Find your favourite.'],
  ['Sign in to Thread','Your account and plan, remembered on your Mac.'],
  ['Connect your AI','Use Codex, or an OpenAI or Anthropic API key.'],
  ['Find your voice','Choose one of six local neural voices.'],
  ['Choose permissions','You decide what your buddy can access.'],
  ['Test a real response','Check your connection before you get going.'],
  ['Say hello','Close Settings. Your buddy stays with you.'],
];

export default function SetupPreview({buddy,name}){
  return <section className="launch-setup" aria-labelledby="setup-heading">
    <DesktopWindow title="Welcome to Thread" className="launch-window setup-preview">
      <div className="setup-body">
        <div className="setup-intro">
          <h2 id="setup-heading">Settled in.<br/>Then out of your way.</h2>
          <p>A proper welcome, from picking a buddy to your first conversation. The Mac app walks you through each step.</p>
          <a className="setup-guide-link" href="/mac">Setup & installation guide <ArrowUpRight size={16} aria-hidden="true"/></a>
          <div className="setup-buddy-preview" aria-hidden="true">
            <Character kind={buddy}/>
            <div><span className="setup-hello">Hey, I’m {name}.</span><span>Let’s make ourselves at home.</span></div>
          </div>
          <span className="setup-beta-note"><Download size={13} aria-hidden="true"/>Apple silicon · macOS 14+ · Early beta</span>
        </div>
        <div className="setup-itinerary">
          <div className="setup-itinerary-heading"><strong>A little setup. Then you’re off.</strong><span>In the Mac app</span></div>
          <ol>{steps.map(([title,description],i)=><li key={title}>
            <span className="setup-step-number" aria-hidden="true">{i===steps.length-1?<Check size={14}/>:String(i+1).padStart(2,'0')}</span>
            <div><strong>{title}</strong><p>{description}</p></div>
          </li>)}</ol>
        </div>
      </div>
    </DesktopWindow>
  </section>;
}
