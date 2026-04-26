import React from "react";

export const AI_AGENT_CSS = `
  .agent-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .agent-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .agent-scrollbar::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    transition: background-color 0.25s ease;
  }
  .agent-scrollbar.show-scrollbar::-webkit-scrollbar-thumb,
  .agent-scrollbar:hover::-webkit-scrollbar-thumb,
  .agent-scrollbar:focus-within::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
  }
  .agent-scrollbar.show-scrollbar::-webkit-scrollbar-thumb:hover,
  .agent-scrollbar:hover::-webkit-scrollbar-thumb:hover,
  .agent-scrollbar:focus-within::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.6);
  }
  .agent-fade-in {
    animation: agentFadeIn 0.35s ease-out forwards;
  }
  .agent-rise-in {
    animation: agentRiseIn 0.35s ease-out forwards;
  }
  .agent-pulse-grid {
    background-image:
      linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  .agent-line-grid {
    background-color: rgba(248, 250, 252, 0.7);
    background-image:
      linear-gradient(rgba(226, 232, 240, 0.85) 1px, transparent 1px),
      linear-gradient(90deg, rgba(226, 232, 240, 0.85) 1px, transparent 1px);
    background-size: 28px 28px;
  }
  .agent-markdown {
    font-size: 0.95rem;
    line-height: 1.7;
    color: inherit;
    font-family: inherit;
  }
  .agent-markdown p:first-child { margin-top: 0; }
  .agent-markdown p:last-child { margin-bottom: 0; }
  .agent-markdown p, .agent-markdown ul, .agent-markdown ol, .agent-markdown blockquote, .agent-markdown pre {
    margin: 0.85rem 0;
  }
  .agent-markdown ul,
  .agent-markdown ol {
    padding-left: 1.35rem;
    list-style-position: outside;
  }
  .agent-markdown ul { list-style-type: disc; }
  .agent-markdown ol { list-style-type: decimal; }
  .agent-markdown li {
    margin: 0.45rem 0;
    padding-left: 0.1rem;
  }
  .agent-markdown li::marker {
    color: #334155;
    font-weight: 800;
  }
  .agent-markdown li > p {
    display: inline;
    margin: 0;
  }
  .agent-markdown code {
    background: rgba(15, 23, 42, 0.08);
    padding: 0.15rem 0.45rem;
    border-radius: 0.5rem;
    font-size: 0.9em;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }
  .agent-markdown pre {
    background: #0f172a;
    color: #f8fafc;
    padding: 1.25rem;
    border-radius: 1.25rem;
    overflow-x: auto;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
    margin: 1.5rem 0;
  }
  .agent-markdown pre code { background: transparent; padding: 0; }
  .agent-markdown blockquote {
    border-left: 4px solid #3b82f6;
    padding: 0.75rem 1.25rem;
    margin: 1.5rem 0;
    font-style: italic;
    color: inherit;
    opacity: 0.9;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 0 1rem 1rem 0;
  }
  .agent-markdown table {
    width: 100%;
    table-layout: fixed;
    margin: 1.5rem 0;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 0.75rem;
    overflow: hidden;
    background: transparent;
    box-shadow: none;
  }
  .agent-markdown th {
    background: rgba(241, 245, 249, 0.65);
    padding: 0.8rem 0.75rem;
    font-weight: 800;
    text-align: left;
    border-bottom: 1px solid rgba(148, 163, 184, 0.4);
    font-size: 0.68rem;
    line-height: 1.35;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #334155;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
    vertical-align: top;
  }
  .agent-markdown td {
    padding: 0.75rem;
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
    font-size: 0.82rem;
    line-height: 1.45;
    color: #0f172a;
    font-weight: 600;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
    vertical-align: top;
  }
  .agent-markdown tr:last-child td { border-bottom: none; }
  .agent-markdown tr:nth-child(even) td { background: rgba(248, 250, 252, 0.45); }
  @media (max-width: 768px) {
    .agent-markdown table {
      font-size: 0.74rem;
    }
    .agent-markdown th,
    .agent-markdown td {
      padding: 0.6rem 0.5rem;
    }
  }
  .agent-markdown h1, .agent-markdown h2, .agent-markdown h3 {
    font-weight: 800;
    margin-top: 2rem;
    margin-bottom: 1rem;
    color: #0f172a;
  }
  .agent-markdown h1 { font-size: 1.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
  .agent-markdown h2 { font-size: 1.5rem; }
  .agent-markdown h3 { font-size: 1.25rem; }

  @keyframes agentFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes agentRiseIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes agentSlideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
  @keyframes agent-cursor-blink { 
    0%, 100% { opacity: 1; } 
    50% { opacity: 0; } 
  }
  .agent-slide-in-left {
    animation: agentSlideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .agent-typing-cursor {
    display: inline-block;
    width: 2px;
    height: 1.1em;
    background: #3b82f6;
    margin-left: 2px;
    vertical-align: middle;
    animation: agent-cursor-blink 1s steps(2) infinite;
  }
`;

export const AgentStyles = () => <style>{AI_AGENT_CSS}</style>;
