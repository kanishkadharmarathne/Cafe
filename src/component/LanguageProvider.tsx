import { useEffect, useState, type ReactNode } from 'react'
import { LanguageContext, type Language } from '../lib/language'

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem('language') === 'en' ? 'en' : 'ro'
  )

  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  return <LanguageContext.Provider value={{ language, setLanguage, t: (en, ro) => language === 'ro' ? ro : en }}>{children}</LanguageContext.Provider>
}
