const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        Plățile reale nu sunt încă activate. Finalizează activarea plăților pentru a încasa live.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-sm text-accent-foreground">
        Mediu de test — plățile efectuate aici nu sunt reale.
      </div>
    );
  }
  return null;
}

export default PaymentTestModeBanner;
