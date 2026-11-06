import React, { useEffect, useState } from 'react';
import { Sun, Moon, Monitor, Check, KeyRound, ShieldCheck, Github, ArrowUpRight, Loader2 } from 'lucide-react';
import { useTheme } from './theme';
import { REPO, GithubIcon } from './Brand';
export default function SettingsPanel({ db, session, isDemo, preferences, onPreferences, entitlement, refreshEntitlement }) {
 const { theme, setTheme } = useTheme();
 const [name, setName] = useState(preferences.display_name || ''), [interval, setIntervalValue] = useState(preferences.refresh_seconds || 15), [saving, setSaving] = useState(false), [notice, setNotice] = useState(''), [code, setCode] = useState(''), [redeeming, setRedeeming] = useState(false), [redeemNotice, setRedeemNotice] = useState('');
 useEffect(() => { setName(preferences.display_name || ''); setIntervalValue(preferences.refresh_seconds || 15); }, [preferences.display_name, preferences.refresh_seconds]);
 async function save(e) {
  e.preventDefault();setSaving(true);setNotice('');
  const next={display_name:name.trim(),theme,refresh_seconds:Number(interval)};
  try {
   if(!isDemo){const{error}=await db.from('agent_preferences').upsert({...next,user_id:session.user.id,updated_at:new Date().toISOString()});if(error)throw error;}
   onPreferences(next);setNotice(isDemo?'Appearance applied to this device. Sign in to sync account settings.':'Settings saved to your account.');
  }catch{setNotice('Unable to save settings. Please try again.');}finally{setSaving(false);}
 }
 async function redeem(e) {
  e.preventDefault();setRedeemNotice('');
  if(isDemo){setRedeemNotice('Sign in to redeem a code on your account.');return;}
  setRedeeming(true);
  try{
   const result=await fetch('/api/cloud?path=functions/v1/thread-redeem',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({code:code.trim()})});
   const data=await result.json();if(!result.ok||!data.ok)throw Error(data.error||'Unable to redeem this code.');
   setCode('');await refreshEntitlement();setRedeemNotice('You’re in. Pro is unlocked on your account.');
  }catch(error){setRedeemNotice(error.message);}finally{setRedeeming(false);}
 }
 return <div className="settings-page"><span className="section-label">MAKE YOURSELF AT HOME</span><h1>Your Thread.</h1><p className="settings-intro">A few small things, just the way you like them.</p>
 <form onSubmit={save} className="settings-form">
  <section className="settings-section"><div className="settings-section-heading"><span className="settings-icon">Aa</span><div><h2>The basics</h2><p>A familiar face in your workspace.</p></div></div><div className="settings-fields"><label>Display name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} placeholder="What should we call you?" /></label><label>Email address<input readOnly value={isDemo?'Demo workspace':session.user.email} /><small>Your sign-in email. Not editable here.</small></label></div></section>
  <section className="settings-section"><div className="settings-section-heading"><Sun size={20}/><div><h2>Appearance</h2><p>Easy on your eyes. At any hour.</p></div></div><fieldset className="theme-options"><legend className="sr-only">Color theme</legend>{[['light',Sun,'Light'],['dark',Moon,'Dark'],['system',Monitor,'System']].map(([value,Icon,label])=><label key={value} className={`theme-choice ${theme===value?'chosen':''}`}><input type="radio" name="theme" value={value} checked={theme===value} onChange={()=>setTheme(value)}/><span className={`theme-swatch swatch-${value}`}><span/><span/><span/></span><span><Icon size={14}/>{label}{theme===value&&<Check size={13}/>}</span></label>)}</fieldset><p className="field-hint">System follows your device. Changes preview immediately; save to sync across devices.</p></section>
  <section className="settings-section"><div className="settings-section-heading"><Monitor size={20}/><div><h2>Workspace updates</h2><p>How often Thread checks for new agent activity.</p></div></div><label className="refresh-setting">Refresh every<select value={interval} onChange={e=>setIntervalValue(Number(e.target.value))}><option value={15}>15 seconds</option><option value={30}>30 seconds</option><option value={60}>60 seconds</option></select></label></section>
  <div className="settings-save"><span role="status">{notice}</span><button className="btn dark small" disabled={saving}>{saving?<Loader2 size={14} className="spin"/>:<Check size={14}/>}Save settings</button></div>
 </form>
 <section className="settings-section redeem-section"><div className="settings-section-heading"><KeyRound size={21}/><div><h2>Redeem an access code</h2><p>A little more room, on us.</p></div><span className="plan-chip">{entitlement.pro?'PRO':'FREE'}</span></div>{entitlement.source==='code'?<div className="redeemed-state"><ShieldCheck size={24}/><div><strong>Complimentary Pro is active.</strong><p>50 active tasks. 10 connections. No subscription required.</p></div></div>:<><p className="redeem-description">Have a private Thread code? Redeem it here to unlock Pro on this account. Each code can be used once.</p><form onSubmit={redeem} className="redeem-form"><label>Access code<input type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} value={code} onChange={e=>setCode(e.target.value)} maxLength={100} placeholder="Paste your private access code" required/></label><button className="btn dark" disabled={redeeming||!code.trim()}>{redeeming?<Loader2 size={15} className="spin"/>:<KeyRound size={15}/>}Redeem code</button></form></>}{redeemNotice&&<p className="notice" role="status">{redeemNotice}</p>}<p className="field-hint"><ShieldCheck size={12}/>Verified on the server. Your code is never stored on this device.</p></section>
 <a className="settings-source" href={REPO} target="_blank" rel="noreferrer"><GithubIcon/><div><strong>Built in the open.</strong><span>Explore Thread on GitHub.</span></div><ArrowUpRight size={17}/></a>
 </div>;
}
