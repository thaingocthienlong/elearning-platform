'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SubmitTicketForm } from './SubmitTicketForm';
import { TicketHistory } from './TicketHistory';

declare global {
    interface Window {
        grecaptcha: any;
    }
}

export function ReportButton() {
    const pathname = usePathname();
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
    // Force history refresh by toggling this key
    const [refreshKey, setRefreshKey] = useState(0);

    // Hide on meeting page
    if (pathname === '/meeting') return null;

    const handleSuccess = () => {
        // Close dialog is handled by the component's countdown
        setOpen(false);
        setRefreshKey(prev => prev + 1); // Refresh history for next time
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} modal={false}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    size="sm"
                    id="tour-report-btn"
                    className="fixed bottom-6 left-6 z-40 h-11 rounded-full border border-primary/20 bg-primary px-5 text-primary-foreground shadow-none animate-in fade-in slide-in-from-bottom-4 duration-700 hover:bg-primary/90 md:z-50"
                >
                    <span className="hidden sm:inline-flex items-center">
                        <MessageSquare className="h-4 w-4" />
                        {t('reportIssue')}
                    </span>
                    <span className="sm:hidden">{t('report')}</span>
                </Button>
            </DialogTrigger>
            <DialogContent
                onInteractOutside={(event) => event.preventDefault()}
                className="flex max-h-[90vh] w-[95vw] max-w-[500px] flex-col gap-0 overflow-hidden border-border bg-white p-0 shadow-none sm:rounded-[18px]"
            >
                <div className="p-6 pb-2">
                    <DialogHeader className="space-y-3">
                        <p className="text-[15px] text-muted-foreground">{t('supportDesk')}</p>
                        <DialogTitle className="text-xl">{t('reportAnIssue')}</DialogTitle>
                        <DialogDescription className="text-sm">
                            {t('reportDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex w-full border-b mt-4">
                        <button
                            className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === 'submit' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('submit')}
                        >
                            {t('submitTicket')}
                        </button>
                        <button
                            className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === 'history' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('history')}
                        >
                            {t('myTickets')}
                        </button>
                    </div>
                </div>

                <div className="p-6 pt-2 flex-1 overflow-y-auto">
                    {activeTab === 'submit' ? (
                        <SubmitTicketForm
                            onSuccess={handleSuccess}
                            onCancel={() => setOpen(false)}
                        />
                    ) : (
                        <TicketHistory key={refreshKey} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
