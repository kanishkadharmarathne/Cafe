import { createContext, useContext } from 'react'

export type Language = 'ro' | 'en'

export interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (en: string, ro: string) => string
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}

export function localized(language: Language, en: string | null, ro: string | null): string {
  return (language === 'ro' ? ro?.trim() || en?.trim() : en?.trim() || ro?.trim()) || ''
}
