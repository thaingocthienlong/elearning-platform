import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listVdoCipherAccounts } from '@/lib/vdocipher-accounts';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return NextResponse.json({ accounts: listVdoCipherAccounts() });
}
