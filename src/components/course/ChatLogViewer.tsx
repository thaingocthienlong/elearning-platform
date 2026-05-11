'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

interface ChatMessage {
    timestamp: string;
    sender: string;
    message: string;
    type?: 'reaction' | 'reply';
    replyTo?: string;
    emoji?: string;
    originalSender?: string;
    originalMessage?: string;
}

interface ChatLogViewerProps {
    chatLog: ChatMessage[] | null;
}

export default function ChatLogViewer({ chatLog }: ChatLogViewerProps) {
    if (!chatLog || chatLog.length === 0) {
        return null;
    }

    // Helper to generate initials
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Card className="mt-6">
            <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Class Chat History
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[500px] w-full p-4">
                    <div className="space-y-4">
                        {chatLog.map((msg, index) => (
                            <div key={index} className="flex gap-3 text-sm group">
                                <div className="flex-shrink-0">
                                    {msg.type === 'reaction' ? (
                                        <div className="h-8 w-8 mt-1 flex items-center justify-center text-lg">
                                            {msg.emoji}
                                        </div>
                                    ) : (
                                        <div className="h-8 w-8 mt-1 rounded-full bg-muted flex items-center justify-center border text-xs text-muted-foreground font-medium uppercase">
                                            {getInitials(msg.sender)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`font-semibold text-primary truncate ${msg.type === 'reaction' ? 'text-muted-foreground font-normal italic' : ''}`}>
                                            {msg.type === 'reaction' ? (
                                                <span>{msg.sender} reacted to:</span>
                                            ) : (
                                                msg.sender
                                            )}
                                        </span>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{msg.timestamp}</span>
                                    </div>

                                    {/* Reply Context Block */}
                                    {(msg.replyTo || (msg.type === 'reaction' && msg.replyTo)) && (
                                        <div className="mt-1 mb-2 rounded bg-muted/40 border-l-4 border-primary/30 p-2 text-xs">
                                            <div className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">
                                                <span className="opacity-70">
                                                    {msg.type === 'reaction' ? 'Reacted to' : 'Replying to'}
                                                </span>
                                                {msg.originalSender ? (
                                                    <span className="text-primary/70 font-semibold">{msg.originalSender}</span>
                                                ) : (
                                                    <span className="italic">message</span>
                                                )}
                                            </div>
                                            <div className="text-muted-foreground/80 line-clamp-2 italic">
                                                {msg.originalMessage || `"${msg.replyTo}"`}
                                            </div>
                                        </div>
                                    )}

                                    {/* Message Content */}
                                    {msg.type === 'reaction' && !msg.message ? (
                                        null
                                    ) : (
                                        <div className="text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                                            {msg.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
