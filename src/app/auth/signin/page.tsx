'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, GraduationCap, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';

import { Suspense, useState } from 'react';

function SignInContent() {
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const error = searchParams.get('error');

    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = () => {
        setIsLoading(true);
        signIn('google', { callbackUrl: '/' });
    };

    return (
        <div className="design-page flex min-h-[calc(100vh-2.75rem)] items-center justify-center bg-[#f5f5f7] px-4 py-12">
            <Card className="w-full max-w-md rounded-[18px] border-border bg-white shadow-none">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <GraduationCap className="h-6 w-6" />
                    </div>
                    <p className="text-[15px] text-muted-foreground">{t('instituteAccess')}</p>
                    <CardTitle className="text-2xl">{t('welcomeBack')}</CardTitle>
                    <CardDescription>
                        {t('enterEmailToSignIn')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {error === 'OAuthAccountNotLinked' && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t('accountError')}</AlertTitle>
                            <AlertDescription>
                                {t('accountExistsError')}
                            </AlertDescription>
                        </Alert>
                    )}
                    {error === 'AccessDenied' && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t('accessDenied')}</AlertTitle>
                            <AlertDescription>
                                {t('accessDeniedMessage')}
                            </AlertDescription>
                        </Alert>
                    )}
                    {error === 'SessionRevoked' && (
                        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <AlertTitle className="text-orange-600">{t('sessionRevoked')}</AlertTitle>
                            <AlertDescription className="text-orange-700 dark:text-orange-400">
                                {t('sessionRevokedMessage')}
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="grid gap-2">
                        <Button variant="outline" onClick={handleSignIn} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    {t('signingIn')}
                                </>
                            ) : (
                                <>
                                    <Mail className="mr-2 h-4 w-4" />
                                    {t('signInWithGoogle')}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function SignInPage() {
    const { t } = useLanguage();
    return (
        <Suspense fallback={<div>{t('loading')}</div>}>
            <SignInContent />
        </Suspense>
    );
}
