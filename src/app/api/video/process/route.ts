import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { error: 'Tencent processing starts during upload via WV-SAES-V1.' },
        { status: 410 }
    );
}
