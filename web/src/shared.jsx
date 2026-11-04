import React from 'react';import mark from '../public/brand/brand-mark.png?inline';import SpotlightCard from './bits/SpotlightCard';
export const providers=[['openai','OpenAI','GPT models','#68ceb1'],['anthropic','Anthropic','Claude models','#dca888'],['google','Google Gemini','Gemini models','#88adff'],['openrouter','OpenRouter','Hundreds of models','#c7cacd'],['deepseek','DeepSeek','DeepSeek models','#6c9eff'],['groq','Groq','Fast inference','#f4a388'],['xai','xAI','Grok models','#ffffff'],['ollama','Ollama','Local models','#c3c8d1']];
export function Brand({word=true}){return <span className="brand"><img src={mark} alt=""/>{word&&<span>thread<span className="brand-dot">.</span></span>}</span>}
export function ProviderLogo({id,size=23}){return <img className={'provider-logo '+(['openai','xai','ollama','openrouter','groq'].includes(id)?'mono':'')} src={logoData[id]||logoData.openrouter} width={size} height={size} alt=""/>}
import logoData from './logos.json';
export function GlowCard({children,className='',...props}){return <SpotlightCard className={className} spotlightColor="#c2c5c8" intensity={.12} borderGlow={.3} grain={0} {...props}>{children}</SpotlightCard>}
