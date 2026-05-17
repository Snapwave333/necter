import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import zhTranslations from './locales/zh.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';
import deTranslations from './locales/de.json';
import jaTranslations from './locales/ja.json';
import koTranslations from './locales/ko.json';
import ptTranslations from './locales/pt.json';
import ruTranslations from './locales/ru.json';
import arTranslations from './locales/ar.json';
import hiTranslations from './locales/hi.json';
import itTranslations from './locales/it.json';
import nlTranslations from './locales/nl.json';
import plTranslations from './locales/pl.json';
import trTranslations from './locales/tr.json';
import viTranslations from './locales/vi.json';

i18n
  .use(LanguageDetector) // auto-detect browser language
  .use(initReactI18next) // init react-i18next
  .init({
    resources: {
      en: { translation: enTranslations },
      zh: { translation: zhTranslations },
      es: { translation: esTranslations },
      fr: { translation: frTranslations },
      de: { translation: deTranslations },
      ja: { translation: jaTranslations },
      ko: { translation: koTranslations },
      pt: { translation: ptTranslations },
      ru: { translation: ruTranslations },
      ar: { translation: arTranslations },
      hi: { translation: hiTranslations },
      it: { translation: itTranslations },
      nl: { translation: nlTranslations },
      pl: { translation: plTranslations },
      tr: { translation: trTranslations },
      vi: { translation: viTranslations },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'ru', 'ar', 'hi', 'it', 'nl', 'pl', 'tr', 'vi'],
    interpolation: { escapeValue: false },
    pluralSeparator: '_',
    contextSeparator: '_',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
