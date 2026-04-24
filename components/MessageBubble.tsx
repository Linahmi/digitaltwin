'use client'

import { ChatMessage } from '@/types/patient'
import { User, Bot } from 'lucide-react'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`
        flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0
        ${isUser ? 'bg-blue-600' : 'bg-emerald-600'}
      `}>
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>

      <div className={`
        max-w-[80%] rounded-2xl px-4 py-3
        ${isUser 
          ? 'bg-blue-600 text-white' 
          : 'bg-slate-800 text-slate-100 border border-slate-700'
        }
      `}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-600">
            <p className="text-xs text-slate-400 mb-2">Sources:</p>
            {message.citations.map((citation, idx) => (
              <a
                key={citation.pmid}
                href={`https://pubmed.ncbi.nlm.nih.gov/${citation.pmid}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-emerald-400 hover:text-emerald-300 mb-1"
              >
                [{idx + 1}] {citation.title.substring(0, 60)}... ({citation.year})
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
