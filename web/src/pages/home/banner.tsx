import { useTranslation } from 'react-i18next';

export function NextBanner() {
  const { t, i18n } = useTranslation();
  return (
    <h1
      className="text-5xl leading-normal text-left"
      dir={i18n.language?.startsWith('ar') ? 'rtl' : 'ltr'}
    >
      <span className="font-semibold text-text-primary">
        {t('header.welcome')}{' '}
      </span>
      <span className="font-bold text-transparent bg-clip-text bg-gradient-to-l from-[#40EBE3] to-[#4A51FF]">
        OneRAG
      </span>
    </h1>
  );
}
