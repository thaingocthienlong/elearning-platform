'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { TOS_VERSION } from '@/lib/tos-access';

const SCROLL_END_TOLERANCE_PX = 4;
const SECTION_KEYS = [
  ['tosPersonalTitle', 'tosPersonalBody'],
  ['tosIntellectualPropertyTitle', 'tosIntellectualPropertyBody'],
  ['tosConductTitle', 'tosConductBody'],
  ['tosSecurityTitle', 'tosSecurityBody'],
  ['tosLifetimeTitle', 'tosLifetimeBody'],
] as const;

type TosConsentDialogProps = {
  onAccepted?: () => void;
  onDecline?: () => void;
};

function reachedEnd(element: HTMLElement): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= SCROLL_END_TOLERANCE_PX;
}

export default function TosConsentDialog({
  onAccepted = () => window.location.reload(),
  onDecline = () => window.location.assign('/'),
}: TosConsentDialogProps = {}) {
  const { language, t } = useLanguage();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const [hasRead, setHasRead] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markReadAtEnd = useCallback((element: HTMLElement) => {
    if (reachedEnd(element)) setHasRead(true);
  }, []);

  useEffect(() => {
    const measure = () => {
      const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
        '[data-radix-scroll-area-viewport]',
      );
      if (viewport) markReadAtEnd(viewport);
    };
    const frame = window.requestAnimationFrame(() => {
      setHasRead(false);
      setConfirmed(false);
      measure();
    });
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, [language, markReadAtEnd]);

  async function accept() {
    if (!hasRead || !confirmed || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/tos/accept', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: true, version: TOS_VERSION }),
      });
      if (!response.ok) throw new Error('acceptance rejected');
      onAccepted();
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
      setError(t('tosSubmitError'));
    }
  }

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-2rem)] gap-4 sm:max-w-2xl"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-full bg-red-500/10 p-2 text-red-600">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <DialogTitle>{t('tosTitle')}</DialogTitle>
          </div>
          <DialogDescription>{t('tosDescription')}</DialogDescription>
        </DialogHeader>

        <ScrollArea
          ref={scrollAreaRef}
          role="region"
          aria-label={t('tosScrollRegionLabel')}
          tabIndex={0}
          className="h-[min(48vh,28rem)] rounded-md border"
          onScrollCapture={(event) => {
            if (event.target instanceof HTMLElement) markReadAtEnd(event.target);
          }}
        >
          <div className="space-y-5 p-4 pr-6 text-sm leading-6">
            {SECTION_KEYS.map(([titleKey, bodyKey]) => (
              <section key={titleKey} className="space-y-1">
                <h2 className="font-semibold text-foreground">{t(titleKey)}</h2>
                <p className="text-muted-foreground">{t(bodyKey)}</p>
              </section>
            ))}
          </div>
        </ScrollArea>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t(hasRead ? 'tosReadComplete' : 'tosReadInstruction')}
        </p>

        <div className="flex items-start gap-3">
          <Checkbox
            id="tos-confirmation"
            checked={confirmed}
            disabled={!hasRead || submitting}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
          />
          <label htmlFor="tos-confirmation" className="text-sm leading-5">
            {t('tosConfirmation')}
          </label>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={submitting} onClick={onDecline}>
            {t('tosDecline')}
          </Button>
          <Button type="button" disabled={!hasRead || !confirmed || submitting} onClick={accept}>
            {t(submitting ? 'tosSubmitting' : 'tosAgree')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
