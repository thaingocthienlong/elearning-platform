import { NextRequest, NextResponse } from 'next/server';

/**
 * FairPlay Certificate Endpoint
 * Fetches the FairPlay certificate from Axinom and serves it to the client
 */
export async function GET(req: NextRequest) {
    try {
        const certUrl = process.env.AXINOM_FAIRPLAY_CERT_URL;

        if (!certUrl) {
            console.error('AXINOM_FAIRPLAY_CERT_URL not configured');
            return NextResponse.json(
                { error: 'FairPlay certificate not configured' },
                { status: 500 }
            );
        }

        // Fetch certificate from Axinom
        console.log(`Fetching FairPlay certificate from: ${certUrl}`);
        const response = await fetch(certUrl);

        if (!response.ok) {
            console.error(`Failed to fetch FairPlay certificate. Status: ${response.status}, URL: ${certUrl}`);
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
        console.error('Error fetching FairPlay certificate:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
