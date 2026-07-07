import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { reportsApi } from '../../api'
import AssistantMessageContent from '../assistant/AssistantMessageContent'
import { SendArrowIcon, TerraAssistantAvatar } from '../assistant/AssistantIcons'
import type { ReportChatMessage } from '../../types'

interface ReportPdfChatProps {
  slug: string
  enabled: boolean
}

function chatErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const status = err.response?.status
    const data = err.response?.data as { detail?: string } | undefined
    if (status === 402) {
      return 'You have used all assistant credits for this period.'
    }
    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail
    }
  }
  return 'Could not send message. Try again in a moment.'
}

function displayMessageContent(message: ReportChatMessage): string {
  if (message.role !== 'user') return message.content
  const match = message.content.match(/User question:\s*\n([\s\S]+)$/i)
  return match?.[1]?.trim() || message.content
}

export default function ReportPdfChat({ slug, enabled }: ReportPdfChatProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ReportChatMessage[]>([])
  const [pendingUser, setPendingUser] = useState<string | null>(null)
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

  const send = useMutation({
    mutationFn: (message: string) => reportsApi.sendChat(slug, message).then((r) => r.data),
    onSuccess: (payload) => {
      setMessages(payload.messages)
      setInput('')
      setPendingUser(null)
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
    onError: () => {
      setPendingUser(null)
    },
  })

  const threadMessages: ReportChatMessage[] = pendingUser
    ? [...messages, { role: 'user', content: pendingUser }]
    : messages

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages, send.isPending])

  const sendError = send.isError ? chatErrorMessage(send.error) : null

  if (!enabled) return null

  const canSend = input.trim().length > 0 && !send.isPending

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || send.isPending) return
    setPendingUser(text)
    setInput('')
    send.mutate(text)
  }

  return (
    <section className="report-pdf-chat card mt-8">
      <header className="report-pdf-chat__header">
        <h2 className="text-lg font-semibold text-app-text">Ask about this PDF</h2>
      </header>

      <div className="report-pdf-chat__thread" aria-live="polite">
        {threadMessages.length === 0 && !send.isPending ? (
          <p className="report-pdf-chat__empty">Ask a question about findings, methods, or recommendations.</p>
        ) : (
          threadMessages.map((msg, index) => (
            <div
              key={`${msg.role}-${index}`}
              className={`report-pdf-chat__row ${msg.role === 'user' ? 'report-pdf-chat__row--user' : 'report-pdf-chat__row--assistant'}`}
            >
              {msg.role === 'assistant' && <TerraAssistantAvatar className="report-pdf-chat__avatar shrink-0" />}
              <div
                className={`report-pdf-chat__bubble ${
                  msg.role === 'user' ? 'report-pdf-chat__bubble--user' : 'report-pdf-chat__bubble--assistant'
                }`}
              >
                <AssistantMessageContent content={displayMessageContent(msg)} role={msg.role} />
              </div>
            </div>
          ))
        )}

        {send.isPending && (
          <div className="report-pdf-chat__row report-pdf-chat__row--assistant">
            <TerraAssistantAvatar className="report-pdf-chat__avatar shrink-0" />
            <div className="report-pdf-chat__bubble report-pdf-chat__bubble--assistant report-pdf-chat__bubble--typing">
              <span className="report-pdf-chat__spinner" aria-hidden />
              <span>Reading the report…</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <form className="report-pdf-chat__composer" onSubmit={handleSubmit}>
        <div className="report-pdf-chat__input-wrap">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What does the report say about…"
            className="report-pdf-chat__input"
            disabled={send.isPending}
            aria-label="Ask about this PDF"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className={`report-pdf-chat__send ${canSend ? 'report-pdf-chat__send--active' : ''}`}
          >
            {send.isPending ? (
              <span className="report-pdf-chat__spinner report-pdf-chat__spinner--inverse" aria-hidden />
            ) : (
              <SendArrowIcon className="h-4 w-4" />
            )}
          </button>
        </div>
        {sendError && <p className="report-pdf-chat__error">{sendError}</p>}
      </form>
    </section>
  )
}
