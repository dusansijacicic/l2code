type PayPalTokenResponse = { access_token: string };

function getApiBase() {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getPayPalAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
  }

  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${getApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal token error: ${res.status} ${t}`);
  }

  const data = (await res.json()) as PayPalTokenResponse;
  return data.access_token;
}

type OrderLink = { href: string; rel: string; method?: string };

type CreateOrderResponse = {
  id: string;
  links: OrderLink[];
};

export async function paypalCreateOrder(input: {
  amountValue: string;
  currencyCode: string;
  customId: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ orderId: string; approvalUrl: string }> {
  const token = await getPayPalAccessToken();
  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: input.currencyCode,
          value: input.amountValue,
        },
        custom_id: input.customId,
        description: input.description.slice(0, 127),
      },
    ],
    application_context: {
      brand_name: "Kursevi",
      locale: "sr-RS",
      landing_page: "NO_PREFERENCE",
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
    },
  };

  const res = await fetch(`${getApiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal create order: ${res.status} ${t}`);
  }

  const data = (await res.json()) as CreateOrderResponse;
  const approve = data.links?.find((l) => l.rel === "approve");
  if (!approve?.href) {
    throw new Error("PayPal nije vratio approve link");
  }

  return { orderId: data.id, approvalUrl: approve.href };
}

type OrderDetails = {
  id: string;
  status: string;
  purchase_units?: Array<{
    custom_id?: string;
    payments?: {
      captures?: Array<{
        id: string;
        amount?: { currency_code?: string; value?: string };
      }>;
    };
  }>;
};

export async function paypalGetOrder(orderId: string, accessToken: string): Promise<OrderDetails> {
  const res = await fetch(`${getApiBase()}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal get order: ${res.status} ${t}`);
  }
  return (await res.json()) as OrderDetails;
}

export async function paypalCaptureOrder(
  orderId: string,
  accessToken: string
): Promise<OrderDetails> {
  const res = await fetch(`${getApiBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal capture: ${res.status} ${t}`);
  }
  return (await res.json()) as OrderDetails;
}

export function parsePayPalCustomId(customId: string): {
  courseId: string;
  userId: string;
  platformFeeCents: number;
} | null {
  const parts = customId.split("|");
  if (parts.length !== 3) return null;
  const [courseId, userId, feeStr] = parts;
  const platformFeeCents = Number(feeStr);
  if (!courseId || !userId || !Number.isFinite(platformFeeCents)) return null;
  return { courseId, userId, platformFeeCents };
}

export function centsToPayPalValue(cents: number): string {
  return (cents / 100).toFixed(2);
}
