'use client';

import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Ticket {
    id: string;
    description: string;
    status: 'WAITING' | 'RESOLVED' | 'IN_PROGRESS';
    createdAt: string;
}

export function TicketHistory() {
    const { data: session } = useSession();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const ticketEmail = session?.user?.email || localStorage.getItem('ticket_email');
                if (!ticketEmail) {
                    setLoading(false);
                    return;
                }

                const res = await fetch(`/api/support/my-tickets?email=${encodeURIComponent(ticketEmail)}`);
                if (res.ok) {
                    const data = await res.json();
                    setTickets(data.tickets || []);
                }
            } catch (error) {
                console.error('Failed to fetch tickets', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, [session]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (tickets.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>No tickets found.</p>
                {!session && !localStorage.getItem('ticket_email') && (
                    <p className="text-xs mt-2">Submit a ticket first to track it here.</p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {tickets.map((ticket) => (
                <div key={ticket.id} className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                                ${ticket.status === 'WAITING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                {ticket.status}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">#{ticket.id.slice(-6)}</span>
                    </div>
                    <p className="text-sm line-clamp-2">{ticket.description}</p>
                </div>
            ))}
        </div>
    );
}
