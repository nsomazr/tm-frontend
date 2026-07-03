import { useEffect, useRef } from 'react'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const LENGTH = 6

export default function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const digits = value.padEnd(LENGTH, ' ').slice(0, LENGTH).split('')

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  const updateAt = (index: number, char: string) => {
    const next = value.split('')
    while (next.length < LENGTH) next.push('')
    next[index] = char
    onChange(next.join('').replace(/\s/g, '').slice(0, LENGTH))
  }

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) {
      updateAt(index, '')
      return
    }
    if (cleaned.length > 1) {
      const merged = (value.slice(0, index) + cleaned).slice(0, LENGTH)
      onChange(merged)
      const focusIndex = Math.min(merged.length, LENGTH - 1)
      inputsRef.current[focusIndex]?.focus()
      return
    }
    updateAt(index, cleaned)
    if (index < LENGTH - 1) inputsRef.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index]?.trim() && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < LENGTH - 1) inputsRef.current[index + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (pasted) {
      onChange(pasted)
      const focusIndex = Math.min(pasted.length, LENGTH - 1)
      inputsRef.current[focusIndex]?.focus()
    }
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
      {Array.from({ length: LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          disabled={disabled}
          value={digits[i]?.trim() ? digits[i] : ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-10 h-12 sm:w-11 sm:h-14 text-center text-xl font-bold rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-terra-500 focus:ring-2 focus:ring-terra-500/20 outline-none transition-shadow disabled:opacity-50"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}
