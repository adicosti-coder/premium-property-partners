import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/lib/supabaseClient";

interface ContractEmbeddedCheckoutProps {
  /** Signing token of the contract being paid. */
  token: string;
  returnUrl: string;
}

export function ContractEmbeddedCheckout({ token, returnUrl }: ContractEmbeddedCheckoutProps) {
  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-contract-checkout", {
      body: { token, returnUrl, environment: getStripeEnvironment() },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || data?.error || "Nu am putut inițializa plata");
    }
    return data.clientSecret as string;
  };

  return (
    <div id="checkout" className="min-h-[420px]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

export default ContractEmbeddedCheckout;
