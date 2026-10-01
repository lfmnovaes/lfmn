import { ArrowUpRight, Mail } from 'lucide-react';

import type messages from '@/messages/en.json';

import { Github, Linkedin } from './brand-icons';

export function ContactSection({ copy }: { copy: typeof messages.contact }) {
  return (
    <section className="contact-section page-width" aria-labelledby="contact-title">
      <div className="contact-intro">
        <p className="eyebrow section-label">{copy.label}</p>
        <h2 id="contact-title">
          {copy.title}
          <br />
          <span className="section-accent">{copy.accent}</span>
        </h2>
        <p className="section-description">{copy.body}</p>
      </div>
      <div className="contact-card">
        <a className="contact-email block" href="mailto:lfmnovaes@gmail.com">
          <span className="contact-invitation">
            <Mail size={18} />
            {copy.email}
          </span>
          <span className="contact-address">
            lfmnovaes@gmail.com
            <ArrowUpRight size={22} />
          </span>
        </a>
        <div className="contact-socials">
          <a href="https://github.com/lfmnovaes" target="_blank" rel="noreferrer">
            <Github size={17} />
            GitHub
            <ArrowUpRight size={13} />
          </a>
          <a href="https://www.linkedin.com/in/lfmnovaes/" target="_blank" rel="noreferrer">
            <Linkedin size={17} />
            LinkedIn
            <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}
