import { en } from './en'
import { sw } from './sw'
import type { Locale } from '../types'
import type { Messages } from './en'

export type { Messages }

export const messages: Record<Locale, Messages> = { en, sw }
