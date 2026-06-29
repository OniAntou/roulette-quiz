import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  cursor?: boolean;
}

export function TypewriterText({ text, speed = 30, className = "", cursor = true }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setDisplayedText("");
    setIsTyping(true);
    let i = 0;
    
    // Add a slight initial delay
    const startTimer = setTimeout(() => {
      const timer = setInterval(() => {
        if (i < text.length) {
          setDisplayedText(prev => prev + text.charAt(i));
          i++;
        } else {
          clearInterval(timer);
          setIsTyping(false);
        }
      }, speed);
      
      return () => clearInterval(timer);
    }, 150);

    return () => clearTimeout(startTimer);
  }, [text, speed]);

  return (
    <span className={className}>
      {displayedText}
      {cursor && <span className={`inline-block w-2 h-4 ml-1 align-middle bg-current ${isTyping ? '' : 'animate-pulse'}`} style={{ opacity: isTyping ? 1 : 0.7 }}></span>}
    </span>
  );
}
