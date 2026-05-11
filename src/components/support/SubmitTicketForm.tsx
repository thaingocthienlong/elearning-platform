'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getConsoleLogs, getBrowserInfo } from '@/lib/console-logger';
import { useSession } from 'next-auth/react';

interface SubmitTicketFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export function SubmitTicketForm({ onSuccess, onCancel }: SubmitTicketFormProps) {
    const { t } = useLanguage();
    const { data: session } = useSession();

    const [email, setEmail] = useState('');
    const [description, setDescription] = useState('');
    const [recaptchaToken, setRecaptchaToken] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [canSubmit, setCanSubmit] = useState(true);
    const [waitTime, setWaitTime] = useState(0);
    const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const [isTablet, setIsTablet] = useState(false);

    const recaptchaRef = useRef<HTMLDivElement>(null);
    const recaptchaWidgetId = useRef<number | null>(null);

    // Detect Tablet/iPad
    useEffect(() => {
        const checkTablet = () => {
            const userAgent = navigator.userAgent;
            const isIPad = /iPad|Macintosh/i.test(userAgent) && 'ontouchend' in document;
            const isTabletDevice = /Tablet|Android/i.test(userAgent) && !/Mobile/i.test(userAgent);

            if (isIPad || isTabletDevice || /iPad|Tablet/i.test(userAgent)) {
                setIsTablet(true);
            }
        };
        checkTablet();
    }, []);

    // Auto-fill email
    useEffect(() => {
        if (session?.user?.email) {
            setEmail(session.user.email);
        }
    }, [session]);

    // Check rate limit
    useEffect(() => {
        const checkRateLimit = async () => {
            const storedEmail = localStorage.getItem('ticket_email');
            if (!storedEmail) return;

            try {
                const response = await fetch(`/api/support/ticket?email=${encodeURIComponent(storedEmail)}`);
                if (response.ok) {
                    const data = await response.json();
                    setCanSubmit(data.canSubmit);
                    setWaitTime(data.waitTime);
                    if (!data.canSubmit) {
                        setMessage(t('rateLimitMessage', { minutes: data.waitTime }));
                    }
                }
            } catch (error) {
                console.error('Rate limit check error:', error);
            }
        };

        checkRateLimit();
    }, [t]);

    // Load reCAPTCHA
    useEffect(() => {
        if (isTablet) return;

        if (!window.grecaptcha) {
            const script = document.createElement('script');
            script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.onload = () => setRecaptchaLoaded(true);
            document.body.appendChild(script);
        } else {
            setRecaptchaLoaded(true);
        }
    }, [isTablet]);

    // Initialize reCAPTCHA
    useEffect(() => {
        if (isTablet) return;

        if (recaptchaLoaded && recaptchaWidgetId.current === null) {
            let attempts = 0;
            const maxAttempts = 50;

            const interval = setInterval(() => {
                attempts++;

                if (recaptchaRef.current && window.grecaptcha && window.grecaptcha.render) {
                    clearInterval(interval);
                    try {
                        const sitekey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
                        recaptchaWidgetId.current = window.grecaptcha.render(recaptchaRef.current, {
                            sitekey: sitekey,
                            callback: (token: string) => setRecaptchaToken(token),
                            'expired-callback': () => setRecaptchaToken(''),
                        });
                    } catch (error) {
                        console.error('reCAPTCHA render error:', error);
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                }
            }, 100);

            return () => clearInterval(interval);
        }
    }, [recaptchaLoaded, isTablet]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setMessage('');

        if (!recaptchaToken && !isTablet) {
            setMessage(t('completeRecaptcha'));
            setSubmitting(false);
            return;
        }

        try {
            const consoleLogs = getConsoleLogs();
            const browserInfo = getBrowserInfo();
            const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

            const response = await fetch('/api/support/ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    description,
                    recaptchaToken: isTablet ? 'tablet-bypass' : recaptchaToken,
                    consoleLogs,
                    browserInfo,
                    pageUrl,
                }),
            });

            if (response.ok) {
                localStorage.setItem('ticket_email', email);
                localStorage.setItem('ticket_timestamp', Date.now().toString());
                setShowSuccess(true);

                let count = 3;
                const timer = setInterval(() => {
                    count--;
                    setCountdown(count);
                    if (count <= 0) {
                        clearInterval(timer);
                        onSuccess();
                    }
                }, 1000);
            } else {
                const errorText = await response.text();
                setMessage(errorText);
                if (response.status === 429) {
                    setCanSubmit(false);
                }
            }
        } catch (error) {
            console.error('Ticket submission error:', error);
            setMessage(t('ticketSubmissionError'));
        } finally {
            setSubmitting(false);
            if (recaptchaWidgetId.current !== null) {
                try {
                    window.grecaptcha?.reset(recaptchaWidgetId.current);
                    setRecaptchaToken('');
                } catch (error) {
                    console.error('reCAPTCHA reset error:', error);
                }
            }
        }
    };

    if (showSuccess) {
        return (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-300">
                <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                    <CheckCircle className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">
                        {t('ticketSubmitted')}
                    </h3>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                        {t('ticketSubmittedDesc')}
                    </p>
                </div>
                <p className="text-sm text-muted-foreground pt-4">
                    {t('closingIn', { seconds: countdown })}
                </p>
            </div>
        );
    }

    if (!canSubmit) {
        return (
            <div className="py-6">
                <p className="text-center text-muted-foreground">
                    {message || t('rateLimitError', { minutes: waitTime })}
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4 py-2">
                <div className="space-y-2">
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        required
                        disabled={submitting || !!session?.user?.email}
                        className="w-full"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">{t('description')}</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('descriptionPlaceholder')}
                        className="min-h-[120px] w-full resize-none"
                        required
                        disabled={submitting}
                    />
                </div>

                {message && (
                    <div className={`text-sm p-3 rounded-md ${message.includes('success') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {message}
                    </div>
                )}
            </div>

            {!isTablet && (
                <div className="space-y-2 pt-2">
                    <Label>{t('humanVerification')}</Label>
                    <div className="flex justify-center items-center min-h-[78px] bg-muted/30 rounded-md p-2">
                        <div ref={recaptchaRef}></div>
                        {!recaptchaLoaded && (
                            <p className="text-sm text-muted-foreground text-center">
                                {t('loadingRecaptcha')}
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-4 justify-end">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={submitting}
                    className="w-full sm:w-auto"
                >
                    {t('cancel')}
                </Button>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                    {submitting ? (
                        <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            {t('submitting')}
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 h-4 w-4" />
                            {t('submitTicket')}
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
