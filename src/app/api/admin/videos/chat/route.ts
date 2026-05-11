import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const videoId = formData.get('videoId') as string;

        if (!file || !videoId) {
            return new NextResponse('Missing file or videoId', { status: 400 });
        }

        const text = await file.text();
        const lines = text.split('\n');
        const chatLog: any[] = [];
        let currentMessage = null;

        // Regex for "HH:MM:SS\t Từ Name : Message"
        // Handling both tab and potential spaces if format varies slightly
        // Example: 08:29:55	 Từ VIỆN PHÁT TRIỂN NGUỒN LỰC XÃ HỘI PHƯƠNG NAM : Kính gửi...
        const regex = /^(\d{2}:\d{2}:\d{2})\s+Từ\s+(.*?)\s+:\s+(.*)/;

        const findParentMessage = (quote: string) => {
            const cleanQuote = quote.replace(/\.\.\.$/, '');
            for (let i = chatLog.length - 1; i >= 0; i--) {
                const candidate = chatLog[i];
                if (candidate.message && candidate.message.includes(cleanQuote)) {
                    return candidate;
                }
            }
            return null;
        };

        const parseMessageContent = (msg: any) => {
            const reactionMatch = msg.message.match(/^Reacted to "(.*)" with (.*)$/);
            if (reactionMatch) {
                const quote = reactionMatch[1];
                const parent = findParentMessage(quote);
                return {
                    ...msg,
                    type: 'reaction',
                    replyTo: quote,
                    emoji: reactionMatch[2],
                    originalSender: parent?.sender,
                    originalMessage: parent?.message,
                    message: ''
                };
            }

            const replyMatch = msg.message.match(/^Replying to "(.*)"\n?([\s\S]*)$/);
            if (replyMatch) {
                const quote = replyMatch[1];
                const parent = findParentMessage(quote);
                return {
                    ...msg,
                    type: 'reply',
                    replyTo: quote,
                    originalSender: parent?.sender,
                    originalMessage: parent?.message,
                    message: replyMatch[2].trim() || msg.message
                };
            }

            return msg;
        };

        // ... inside loop ...
        // We need to move the push logic to a helper or just do it at the end of the loop iteration?
        // Existing loop pushes `currentMessage` when a new one starts.

        // Let's Rewrite the loop slightly to use the helper on push.
        const pushMessage = (msg: any) => {
            chatLog.push(parseMessageContent(msg));
        };

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const match = trimmedLine.match(regex);

            if (match) {
                // New message
                if (currentMessage) {
                    pushMessage(currentMessage);
                }
                currentMessage = {
                    timestamp: match[1],
                    sender: match[2].trim(),
                    message: match[3].trim(),
                };
            } else if (currentMessage) {
                // Continuation of previous message (multiline)
                currentMessage.message += '\n' + trimmedLine;
            }
        }

        // Push last message
        if (currentMessage) {
            pushMessage(currentMessage);
        }

        await prisma.video.update({
            where: { id: videoId },
            data: { chatLog },
        });

        return NextResponse.json({ success: true, count: chatLog.length });
    } catch (error) {
        console.error('Chat upload error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
