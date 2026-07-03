import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatCircle, X, PaperPlaneRight, Globe } from '@phosphor-icons/react';
import { socketClient } from '../network/SocketClient';

interface ChatMessage {
  senderId: string;
  sender: string;
  message: string;
  timestamp: number;
}

interface ChatBoxProps {
  roomId?: string;
  localId: string;
}

const NAME_COLORS = [
  'text-cyan-theme',
  'text-emerald-theme',
  'text-yellow-400',
  'text-pink-400',
  'text-purple-400',
  'text-orange-400',
];

function getNameColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}

export function ChatBox({ roomId, localId }: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'room' | 'global'>(roomId ? 'room' : 'global');
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = tab === 'room' ? roomMessages : globalMessages;

  // Auto-switch tab when roomId changes
  useEffect(() => {
    if (!roomId && tab === 'room') setTab('global');
  }, [roomId]);

  useEffect(() => {
    const onMessage = (data: ChatMessage) => {
      setRoomMessages(prev => [...prev.slice(-50), data]);
      if (!isOpen) setUnread(prev => prev + 1);
    };

    const onGlobalMessage = (data: ChatMessage) => {
      setGlobalMessages(prev => [...prev.slice(-50), data]);
      if (!isOpen) setUnread(prev => prev + 1);
    };

    socketClient.on('chat:message', onMessage);
    socketClient.on('chat:global_message', onGlobalMessage);

    return () => {
      socketClient.off('chat:message', onMessage);
      socketClient.off('chat:global_message', onGlobalMessage);
    };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const send = () => {
    const text = input.trim();
    if (!text) return;

    if (tab === 'global') {
      socketClient.sendGlobalChat(text);
    } else if (roomId) {
      socketClient.sendChat(roomId, text);
    }

    setInput('');
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[100] w-12 h-12 rounded-full bg-surface border border-border-theme flex items-center justify-center hover:border-cyan-theme transition-colors"
      >
        <ChatCircle size={20} className="text-cyan-theme" weight="fill" />
        {unread > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-theme text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-20 right-4 z-[100] w-72 sm:w-80 h-96 bg-surface border border-border-theme rounded-lg flex flex-col overflow-hidden shadow-lg"
          >
            {/* Tabs */}
            <div className="flex border-b border-border-theme">
              {roomId && (
                <button
                  onClick={() => setTab('room')}
                  className={`flex-1 py-2 text-[10px] font-extrabold tracking-widest uppercase transition-colors ${
                    tab === 'room'
                      ? 'text-cyan-theme border-b-2 border-cyan-theme'
                      : 'text-text-theme-dim hover:text-text-theme'
                  }`}
                >
                  ROOM
                </button>
              )}
              <button
                onClick={() => setTab('global')}
                className={`flex-1 py-2 text-[10px] font-extrabold tracking-widest uppercase flex items-center justify-center gap-1.5 transition-colors ${
                  tab === 'global'
                    ? 'text-emerald-theme border-b-2 border-emerald-theme'
                    : 'text-text-theme-dim hover:text-text-theme'
                }`}
              >
                <Globe size={12} /> GLOBAL
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-2 text-text-theme-dim hover:text-cyan-theme transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin">
              {messages.length === 0 && (
                <p className="text-[11px] text-text-theme-dim/50 text-center mt-8">
                  {tab === 'room' ? 'Chưa có tin nhắn trong phòng' : 'Chưa có tin nhắn global'}
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} className="text-[12px] leading-relaxed">
                  <span className={`font-mono font-bold ${msg.senderId === localId ? 'text-cyan-theme' : getNameColor(msg.sender)}`}>
                    {msg.senderId === localId ? 'Bạn' : msg.sender}
                  </span>
                  <span className="text-text-theme-dim mx-1">:</span>
                  <span className="text-text-theme">{msg.message}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-2 py-2 border-t border-border-theme flex gap-1.5">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value.slice(0, 200))}
                onKeyDown={e => { if (e.key === 'Enter') send(); }}
                placeholder={tab === 'global' ? 'Nhắn global...' : 'Nhắn trong phòng...'}
                className="flex-1 bg-transparent text-[12px] text-text-theme placeholder:text-text-theme-dim/40 outline-none px-2 py-1.5 border border-border-theme rounded focus:border-cyan-theme transition-colors"
              />
              <button
                onClick={send}
                disabled={!input.trim()}
                className="w-8 h-8 flex items-center justify-center rounded border border-border-theme text-cyan-theme hover:bg-cyan-theme/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <PaperPlaneRight size={14} weight="fill" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
