import React from 'react';
import { Github, ArrowUpRight } from 'lucide-react';
export const REPO = 'https://github.com/BenDevelops01/Thread';
export function Mark() { return <span className="mark" aria-hidden="true"><img src="/brand/brand-mark.png" alt="" /></span>; }
export function Logo() { return <a className="logo" href="/" aria-label="Thread home"><Mark /><span>thread</span></a>; }
export function Footer() { return <footer className="footer wrap"><div><Logo /><p>A common thread for your AI work.</p></div><div className="footer-links"><a href={REPO} target="_blank" rel="noreferrer"><Github size={14} /> GitHub <ArrowUpRight size={12} /></a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a><span>© 2026 Thread</span></div></footer>; }
