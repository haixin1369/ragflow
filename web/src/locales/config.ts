import { LanguageAbbreviation } from '@/constants/common';
import storage from '@/utils/authorization-util';
import dayjs from 'dayjs';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { upperFirst } from 'lodash';
import { initReactI18next } from 'react-i18next';
import merge from 'lodash/merge';

import translation_en from './en';
import translation_zh from './zh';

const supportedLanguageCodes = Object.values(LanguageAbbreviation);

export const supportedLanguages = supportedLanguageCodes.map((code) => {
  const locale = new Intl.Locale(code);

  return {
    code,
    locale,
    displayName: upperFirst(
      new Intl.DisplayNames(locale, { type: 'language' }).of(code)!,
    ),
  };
});

export const DEFAULT_LANGUAGE_CODE =
  import.meta.env.VITE_DEFAULT_LANGUAGE_CODE || LanguageAbbreviation.Zh;

// Enterprise customization overlays: the enterprise repository carries real
// implementations under `web/src/ee/locales/`; upstream ships no-op stubs
// under `web/src/ee-stub/locales/` so shared imports resolve in both trees.
// Enterprise content must live only in the enterprise ee/ files, never here.
import translation_en_private from '@/ee/locales/en-private';
import translation_zh_private from '@/ee/locales/zh-private';

const resources = {
  [LanguageAbbreviation.En]: merge(translation_en, translation_en_private),
  [LanguageAbbreviation.Zh]: merge(translation_zh, translation_zh_private),
};

const updateDocumentLocale = (lng: string) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = 'ltr';
  dayjs.locale(lng.startsWith('zh') ? 'zh-cn' : 'en');
};

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    detection: {
      lookupLocalStorage: 'lng',
      order: ['localStorage'],
      caches: [],
    },
    supportedLngs: supportedLanguageCodes,
    resources,
    fallbackLng: DEFAULT_LANGUAGE_CODE,
    interpolation: {
      escapeValue: false,
    },
  });

export const changeLanguageAsync = async (
  lng: string,
  options: { persist?: boolean } = {},
): Promise<void> => {
  const { persist = true } = options;

  if (persist) {
    storage.setLanguage(lng);
  }

  updateDocumentLocale(lng);

  await i18n.changeLanguage(lng);
};

export const initLanguage = async (): Promise<void> => {
  const currentLng = storage.getLanguage() || DEFAULT_LANGUAGE_CODE;

  await changeLanguageAsync(currentLng);
};

export default i18n;
