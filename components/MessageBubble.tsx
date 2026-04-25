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
            ? { background: '#0284c7', color: 'white', boxShadow: '0 2px 8px rgba(2,132,199,0.2)' }
            : { background: 'white', border: '1px solid #bae6fd', color: '#0284c7', boxShadow: '0 2px 8px rgba(14,165,233,0.08)' }
        }
      >
        {isUser ? 'You' : 'AI'}
      </div>

      {/* Bubble */}
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm"
        style={
          isUser
            ? {
                background: '#0284c7',
                color: 'white',
              }
            : {
                background: 'white',
                border: '1px solid #e2e8f0',
                color: '#1e293b',
              }
        }
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
            <p className="text-xs mb-2 font-medium" style={{ color: '#64748b' }}>Sources</p>
            {message.citations.map((c, idx) => (
              <a
                key={c.pmid}
                href={`https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs mb-1 hover:underline"
                style={{ color: '#0284c7' }}
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
