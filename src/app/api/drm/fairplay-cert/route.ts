import { NextResponse } from 'next/server';

/**
 * FairPlay Certificate Endpoint
 * Fetches a configured FairPlay certificate without exposing its URL or bytes in logs.
 */
export async function GET() {
    try {
        const certUrl = process.env.AXINOM_FAIRPLAY_CERT_URL;

        if (!certUrl) {
            console.error('FairPlay certificate URL is not configured');
            return NextResponse.json(
                { error: 'FairPlay certificate not configured' },
                { status: 500 }
            );
        }

        const response = await fetch(certUrl);

        if (!response.ok) {
            console.error('Failed to fetch FairPlay certificate', {
                status: response.status,
            });
            return NextResponse.json(
                { error: 'Failed to fetch certificate' },
                { status: response.status }
            );
        }

        const certificate = await response.arrayBuffer();

        // Return certificate with appropriate headers
        return new NextResponse(certificate, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            },
        });
    } catch (error) {
        console.error('Error fetching FairPlay certificate', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
