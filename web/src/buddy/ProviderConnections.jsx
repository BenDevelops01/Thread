import React from 'react';
import {ArrowUpRight} from 'lucide-react';
import {REPO} from '../Brand';

const connections = [
  {id:'openai', name:'OpenAI', route:'API key or Codex', native:true},
  {id:'anthropic', name:'Anthropic', route:'API key', native:true},
  {id:'gemini', name:'Gemini', route:'Browser bridge'},
  {id:'lmstudio', name:'LM Studio', route:'Local · browser bridge'},
  {id:'ollama', name:'Ollama', route:'Local · browser bridge'},
];

export default function ProviderConnections(){
  return <section className="ai-connections" aria-labelledby="ai-connections-title">
    <div className="ai-connections-heading">
      <h2 id="ai-connections-title">Your AI.<br/>Your little sidekick.</h2>
      <p>Bring the connection<br/>you already use.</p>
    </div>
    <ul className="ai-provider-list">
      {connections.map(provider=><li key={provider.id}>
        <a href={provider.native?'/mac':REPO+'#models'} aria-label={provider.name+' — '+provider.route+(provider.native?' in the Mac app':'')}>
          <span className="ai-provider-brand"><img src={'/providers/'+provider.id+'.svg'} width="28" height="28" alt=""/><strong>{provider.name}</strong></span>
          <span className="ai-provider-route">{provider.route}<ArrowUpRight size={12} aria-hidden="true"/></span>
        </a>
      </li>)}
    </ul>
    <p className="ai-connections-note">OpenAI & Anthropic work in the Mac app. Gemini and local models use the separate <a href={REPO+'#models'}>browser bridge <ArrowUpRight size={11} aria-hidden="true"/></a>.</p>
  </section>;
}
