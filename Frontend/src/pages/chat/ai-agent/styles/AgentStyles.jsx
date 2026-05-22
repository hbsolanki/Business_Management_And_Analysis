import React from "react";

export const AI_AGENT_CSS = `
  @import url("https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap");

  /* Root variables for typography */
  :root {
    --font-sans: "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif;
    --font-display: "Outfit", sans-serif;
    --font-mono: "SFMono-Regular", Consolas, monospace;
  }

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
    background: rgba(148, 163, 184, 0.35);
  }
  .agent-scrollbar.show-scrollbar::-webkit-scrollbar-thumb:hover,
  .agent-scrollbar:hover::-webkit-scrollbar-thumb:hover,
  .agent-scrollbar:focus-within::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.5);
  }
  
  .agent-fade-in {
    animation: agentFadeIn 0.35s ease-out forwards;
  }
  .agent-rise-in {
    animation: agentRiseIn 0.35s ease-out forwards;
  }
  
  /* Modern Masked Grid Coordinates Grid */
  .agent-line-grid {
    position: relative;
    overflow-anchor: auto !important;
    background:
      radial-gradient(circle at 10% 10%, rgba(14, 165, 233, 0.09), transparent 28%),
      radial-gradient(circle at 90% 12%, rgba(59, 130, 246, 0.07), transparent 26%),
      radial-gradient(circle at 80% 85%, rgba(99, 102, 241, 0.07), transparent 24%),
      linear-gradient(180deg, #fcfdfe 0%, #f5f8fc 52%, #ebf2fa 100%);
  }
  .agent-line-grid::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.5), transparent 85%);
    opacity: 0.9;
    z-index: 0;
  }
  .agent-line-grid > * {
    position: relative;
    z-index: 1;
  }

  /* Glassmorphism Double-Border effect */
  .agent-glass {
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(24px) saturate(120%);
    -webkit-backdrop-filter: blur(24px) saturate(120%);
    border: 1px solid rgba(255, 255, 255, 0.85);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
    position: relative;
  }
  .agent-glass::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(
      to bottom right,
      rgba(255, 255, 255, 1),
      rgba(255, 255, 255, 0.3)
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
  
  .agent-markdown {
    font-size: 0.94rem;
    line-height: 1.65;
    color: #334155;
    font-family: var(--font-sans, "Plus Jakarta Sans", "Segoe UI", sans-serif);
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
    color: #475569;
    font-weight: 800;
  }
  .agent-markdown li > p {
    display: inline;
    margin: 0;
  }
  .agent-markdown code {
    background: rgba(15, 23, 42, 0.05);
    padding: 0.18rem 0.4rem;
    border-radius: 0.4rem;
    font-size: 0.85em;
    font-family: var(--font-mono, monospace);
    color: #0284c7;
  }
  
  /* MacOS Monospace Terminal Overlay pre style */
  .agent-markdown pre {
    background: #090f19;
    color: #f1f5f9;
    padding: 1.5rem;
    border-radius: 1.5rem;
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow: 0 16px 40px -10px rgba(15, 23, 42, 0.3);
    margin: 1.5rem 0;
    position: relative;
    font-family: var(--font-mono, monospace);
  }
  .agent-markdown pre::before {
    content: "";
    display: block;
    height: 12px;
    width: 44px;
    margin-bottom: 1.1rem;
    background-image: 
      radial-gradient(circle, #ff5f56 4px, transparent 5px),
      radial-gradient(circle, #ffbd2e 4px, transparent 5px),
      radial-gradient(circle, #27c93f 4px, transparent 5px);
    background-size: 14px 14px;
    background-repeat: no-repeat;
    background-position: 0 0, 14px 0, 28px 0;
    opacity: 0.85;
  }
  .agent-markdown pre code { background: transparent; padding: 0; color: inherit; }
  
  .agent-markdown blockquote {
    border-left: 4px solid #38a5f8;
    padding: 0.75rem 1.25rem;
    margin: 1.5rem 0;
    font-style: italic;
    color: inherit;
    opacity: 0.9;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 0 1rem 1rem 0;
  }
  
  /* Premium Spreadsheet Tables */
  .agent-markdown table {
    width: 100%;
    margin: 1.5rem 0;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 1rem;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.02);
  }
  .agent-markdown th {
    background: linear-gradient(to right, #f8fafc, #f1f5f9);
    padding: 0.9rem 0.8rem;
    font-weight: 800;
    text-align: left;
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
    font-size: 0.72rem;
    line-height: 1.35;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #475569;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
    vertical-align: top;
  }
  .agent-markdown td {
    padding: 0.85rem 0.8rem;
    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
    font-size: 0.84rem;
    line-height: 1.45;
    color: #334155;
    font-weight: 600;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
    vertical-align: top;
  }
  .agent-markdown tr:last-child td { border-bottom: none; }
  .agent-markdown tr:nth-child(even) td { background: rgba(248, 250, 252, 0.45); }
  .agent-markdown tr:hover td { background: rgba(99, 102, 241, 0.03); }
  
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
    font-family: var(--font-display, "Outfit", sans-serif);
  }
  .agent-markdown h1 { font-size: 1.65rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
  .agent-markdown h2 { font-size: 1.4rem; }
  .agent-markdown h3 { font-size: 1.2rem; }

  @keyframes agentFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes agentRiseIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes agentSlideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
  @keyframes agentZoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  
  @keyframes agent-cursor-blink { 
    0%, 100% { opacity: 1; } 
    50% { opacity: 0; } 
  }
  
  @keyframes glow-breathing {
    0%, 100% {
      box-shadow: 0 0 5px rgba(14, 165, 233, 0.15);
      border-color: rgba(14, 165, 233, 0.15);
    }
    50% {
      box-shadow: 0 0 20px rgba(14, 165, 233, 0.35);
      border-color: rgba(14, 165, 233, 0.45);
    }
  }
  
  .animate-in { animation-fill-mode: forwards; }
  .fade-in { animation-name: agentFadeIn; }
  .zoom-in { animation-name: agentZoomIn; }
  .duration-500 { animation-duration: 500ms; }

  .agent-slide-in-left {
    animation: agentSlideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .agent-typing-cursor {
    display: inline-block;
    width: 2px;
    height: 1.1em;
    background: #38a5f8;
    margin-left: 2px;
    vertical-align: middle;
    animation: agent-cursor-blink 1s steps(2) infinite;
  }
  
  .glow-breathing {
    animation: glow-breathing 2.5s ease-in-out infinite;
  }
  .animate-glow-breathing {
    animation: glow-breathing 2.5s ease-in-out infinite;
  }
`;

export const AgentStyles = () => <style>{AI_AGENT_CSS}</style>;
