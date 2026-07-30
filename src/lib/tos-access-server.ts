import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import {
  TOS_COOKIE_NAME,
  TOS_REQUIRED_CODE,
  readSessionToken,
  verifyTosAccessToken,
} from '@/lib/tos-access';

export async function hasTosAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyTosAccessToken(
    cookieStore.get(TOS_COOKIE_NAME)?.value,
    readSessionToken(cookieStore),
    process.env.NEXTAUTH_SECRET,
  );
}

export async function requireTosAccess(): Promise<void> {
  if (!(await hasTosAccess())) {
    redirect('/tos-approval');
  }
}

export function tosAcceptanceRequiredResponse(): NextResponse {
  const response = NextResponse.json(
    { code: TOS_REQUIRED_CODE },
    { status: 403 },
  );
  response.cookies.delete(TOS_COOKIE_NAME);
  return response;
}
