import TosConsentDialog from '@/components/tos/TosConsentDialog';

export default function TosApprovalPage() {
  return (
    <main className="flex min-h-[calc(100vh-2.75rem)] items-center justify-center bg-muted/30 p-4">
      <TosConsentDialog />
    </main>
  );
}
