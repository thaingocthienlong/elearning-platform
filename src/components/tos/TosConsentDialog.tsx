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
const CONTENT_KEYS = [
  'tosContentOne',
  'tosContentTwo',
  'tosContentThree',
  'tosContentFour',
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
        className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[80rem] gap-4 overflow-y-auto p-4 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-[80rem] sm:gap-5 sm:p-6"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-full bg-red-500/10 p-2 text-red-600">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <DialogTitle className="text-2xl leading-tight sm:text-3xl lg:text-[2.75rem]">
              {t('tosTitle')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed text-foreground/75 sm:text-lg lg:text-xl">
            {t('tosDescription')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea
          ref={scrollAreaRef}
          role="region"
          aria-label={t('tosScrollRegionLabel')}
          tabIndex={0}
          className="h-[min(36dvh,20rem)] rounded-md border sm:h-[min(46dvh,30rem)] lg:h-[min(58dvh,42rem)]"
          onKeyDown={(event) => {
            if (event.key !== 'End') return;
            const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
              '[data-radix-scroll-area-viewport]',
            );
            if (!viewport) return;
            event.preventDefault();
            viewport.scrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
            markReadAtEnd(viewport);
          }}
          onScrollCapture={(event) => {
            if (event.target instanceof HTMLElement) markReadAtEnd(event.target);
          }}
        >
          <ul className="mx-auto max-w-[68ch] list-disc space-y-6 px-6 py-5 pl-10 text-xl leading-[1.55] text-foreground sm:space-y-8 sm:px-8 sm:py-6 sm:pl-12 sm:text-2xl lg:px-10 lg:py-8 lg:pl-16 lg:text-[2.1875rem]">
            {CONTENT_KEYS.map((contentKey) => (
              <li key={contentKey}>{t(contentKey)}</li>
            ))}
          </ul>
        </ScrollArea>

        <p
          className="text-base leading-relaxed text-foreground/80 sm:text-lg lg:text-xl"
          aria-live="polite"
        >
          {t(hasRead ? 'tosReadComplete' : 'tosReadInstruction')}
        </p>

        <div className="flex items-start gap-3">
          <Checkbox
            id="tos-confirmation"
            className="mt-0.5 size-5 sm:size-6"
            checked={confirmed}
            disabled={!hasRead || submitting}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
          />
          <label
            htmlFor="tos-confirmation"
            className="text-base leading-relaxed text-foreground sm:text-lg lg:text-xl"
          >
            {t('tosConfirmation')}
          </label>
        </div>

        {error && (
          <p role="alert" className="text-base text-destructive sm:text-lg">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 px-5 text-base sm:h-12 sm:px-6 sm:text-lg"
            disabled={submitting}
            onClick={onDecline}
          >
            {t('tosDecline')}
          </Button>
          <Button
            type="button"
            className="h-11 px-5 text-base sm:h-12 sm:px-6 sm:text-lg"
            disabled={!hasRead || !confirmed || submitting}
            onClick={accept}
          >
            {t(submitting ? 'tosSubmitting' : 'tosAgree')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
