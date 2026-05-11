'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'vi' : 'en');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="h-8 gap-2 rounded-md px-2 text-xs text-white hover:bg-white/10 hover:text-white"
      title={`${t('switchTo')} ${language === 'en' ? t('languageName', { name: 'Vietnamese' }) : t('languageName', { name: 'English' })}`}
    >
      <Languages className="h-3.5 w-3.5" />
      <span className="font-medium hidden sm:inline">{language === 'en' ? 'EN' : 'VI'}</span>
    </Button>
  );
}
