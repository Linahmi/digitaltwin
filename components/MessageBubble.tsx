'use client'

import { ChatMessage } from '@/types/patient'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

      {/* Avatar dot */}
      <div
        className="mt-1 flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold"
        style={
          isUser
            ? { background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.35)', color: '#00e5ff' }
            : { background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)',  color: 'rgba(0,229,255,0.7)' }
        }
      >
        {isUser ? 'You' : 'AI'}
      </div>

      {/* Bubble */}
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={
          isUser
            ? {
                background: 'rgba(0,229,255,0.12)',
                border: '1px solid rgba(0,229,255,0.25)',
                color: '#e2f8ff',
              }
            : {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.82)',
              }
        }
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs mb-2" style={{ color: 'rgba(0,229,255,0.5)' }}>Sources</p>
            {message.citations.map((c, idx) => (
              <a
                key={c.pmid}
                href={`https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs mb-1 hover:underline"
                style={{ color: 'rgba(0,229,255,0.65)' }}
              >
                [{idx + 1}] {c.title.substring(0, 60)}… ({c.year})
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
