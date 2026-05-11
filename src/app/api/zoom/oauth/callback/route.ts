import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message:
      'Zoom app authorization redirect received. This platform does not store Zoom OAuth codes for the Meeting SDK join flow; use the configured Meeting SDK credentials and meeting env vars.',
  });
}
