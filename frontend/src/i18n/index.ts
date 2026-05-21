import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import es from './locales/es.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import it from './locales/it.json'
import pt from './locales/pt.json'
import de from './locales/de.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import ru from './locales/ru.json'
import ko from './locales/ko.json'
import ar from './locales/ar.json'
import nl from './locales/nl.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      fr: { translation: fr },
      it: { translation: it },
      pt: { translation: pt },
      de: { translation: de },
      zh: { translation: zh },
      ja: { translation: ja },
      ru: { translation: ru },
      ko: { translation: ko },
      ar: { translation: ar },
      nl: { translation: nl },
    },
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'pycore_lang',
    },
  })

export default i18n
