import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '../../api'
import type { ReportChatMessage } from '../../types'

interface ReportPdfChatProps {
  slug: string
  enabled: boolean
}

export default function ReportPdfChat({ slug, enabled }: ReportPdfChatProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ReportChatMessage[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['report-chat', slug],
    queryFn: () => reportsApi.chat(slug).then((r) => r.data),
    enabled: enabled && !!slug,
  })

  useEffect(() => {
    if (data?.messages) setMessages(data.messages)
  }, [data])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useMutation({
    mutationFn: (message: string) => reportsApi.sendChat(slug, message).then((r) => r.data),
    onSuccess: (payload) => {
      setMessages(payload.messages)
      setInput('')
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  })

  if (!enabled) return null

  return (
    <section className="card mt-8">
      <h2 className="text-lg font-semibold text-slate-900">Ask about this PDF</h2>
      <p className="text-sm text-slate-600 mt-1">
        Chat with the uploaded report. Answers cite page numbers from the document.
      </p>

      <div className="mt-4 max-h-72 overflow-y-auto space-y-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">Ask a question about findings, methodology, or recommendations.</p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={`${msg.role}-${index}`}
              className={`text-sm rounded-lg px-3 py-2 ${
                msg.role === 'user' ? 'bg-white border border-slate-200 ml-8' : 'bg-terra-50 border border-terra-100 mr-8'
              }`}
            >
              <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1">
                {msg.role === 'user' ? 'You' : 'Terra Meta'}
              </p>
              <p className="text-slate-800 whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const text = input.trim()
          if (!text || send.isPending) return
          send.mutate(text)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What does the report say about…"
          className="input flex-1 text-sm"
          disabled={send.isPending}
        />
        <button type="submit" className="btn-primary text-sm shrink-0" disabled={!input.trim() || send.isPending}>
          {send.isPending ? '…' : 'Ask'}
        </button>
      </form>
      {send.isError && (
        <p className="text-xs text-red-600 mt-2">Could not send message. You may need more assistant credits.</p>
      )}
    </section>
  )
}
