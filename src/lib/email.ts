import nodemailer from 'nodemailer';

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
    // If SMTP credentials are not provided, log the email and return
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.log('⚠️ SMTP credentials not found. Email logging mode:');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${text}`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Secure Video Platform" <noreply@example.com>',
            to,
            subject,
            text,
            html,
        });
        console.log(`📧 Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw error;
    }
}

export async function sendTicketNotification(ticketId: string, userEmail: string, description: string) {
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
        console.warn('⚠️ ADMIN_EMAIL not set. Skipping admin notification.');
        return;
    }

    const subject = `[New Ticket] Support Request from ${userEmail}`;
    const text = `
New support ticket received.

Ticket ID: ${ticketId}
User: ${userEmail}
Description:
${description}

Please check the admin dashboard for more details.
    `;

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Support Ticket Received</h2>
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p><strong>User:</strong> ${userEmail}</p>
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Description:</strong></p>
                <p style="white-space: pre-wrap;">${description}</p>
            </div>
            <p>Please check the admin dashboard for more details.</p>
        </div>
    `;

    await sendEmail({
        to: adminEmail,
        subject,
        text,
        html,
    });
}
