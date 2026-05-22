import { useState, useEffect, useRef } from "react";

/**
 * useStreamingTypewriter Hook
 * Simulates a typewriter effect for streaming content.
 */
export function useStreamingTypewriter(content, speed = 10, isStreaming = false) {
  const [displayedContent, setDisplayedContent] = useState("");
  const contentRef = useRef("");
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      contentRef.current = content;
      return;
    }

    const safeContent = typeof content === 'string' ? content : (content ? JSON.stringify(content) : "");

    if (safeContent.length > contentRef.current.length) {
      const nextChunk = safeContent.slice(contentRef.current.length);
      contentRef.current = safeContent;
      
      let i = 0;
      const type = () => {
        if (i < nextChunk.length) {
          setDisplayedContent((prev) => prev + nextChunk[i]);
          i++;
          timerRef.current = setTimeout(type, speed);
        }
      };
      type();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, speed, isStreaming]);

  return displayedContent;
}
