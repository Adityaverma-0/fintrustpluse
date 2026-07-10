const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;

const isMockMode = !accountNumber || accountNumber.includes("YOUR_") || !keyId || keyId.includes("YOUR_");

export interface PayoutResult {
  payoutId: string;
  status: "pending" | "processing" | "successful" | "failed" | "rejected" | "reversed";
  failureReason?: string;
}

// Basic Authentication header helper
function getAuthHeader(): string {
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

export async function createContactAndFundAccount(
  user: { id: number; name: string; email: string },
  bank: { accountHolderName: string; bankName: string; ifscCode: string; accountNumber: string }
): Promise<{ contactId: string; fundAccountId: string }> {
  if (isMockMode) {
    console.log(`[Payouts Mock] Creating contact and fund account for user ${user.id}`);
    return {
      contactId: `cont_mock_${Math.random().toString(36).slice(2, 10)}`,
      fundAccountId: `fa_mock_${Math.random().toString(36).slice(2, 10)}`,
    };
  }

  // 1. Create Contact
  const contactRes = await fetch("https://api.razorpay.com/v1/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      type: "vendor",
      reference_id: String(user.id),
    }),
  });

  if (!contactRes.ok) {
    const errorBody = await contactRes.text();
    throw new Error(`RazorpayX contact creation failed: ${contactRes.statusText} - ${errorBody}`);
  }

  const contactData = (await contactRes.json()) as { id: string };
  const contactId = contactData.id;

  // 2. Create Fund Account
  const fundAccountRes = await fetch("https://api.razorpay.com/v1/fund_accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({
      contact_id: contactId,
      account_type: "bank_account",
      bank_account: {
        name: bank.accountHolderName,
        ifsc: bank.ifscCode,
        account_number: bank.accountNumber,
      },
    }),
  });

  if (!fundAccountRes.ok) {
    const errorBody = await fundAccountRes.text();
    throw new Error(`RazorpayX fund account creation failed: ${fundAccountRes.statusText} - ${errorBody}`);
  }

  const fundAccountData = (await fundAccountRes.json()) as { id: string };
  return {
    contactId,
    fundAccountId: fundAccountData.id,
  };
}

export async function createPayout(
  fundAccountId: string,
  amountInUSD: number, // conversion logic: we payout in INR equivalent (e.g. amount * 80 INR/USD * 100 paise)
  referenceId: string
): Promise<PayoutResult> {
  const usdToInr = 83; // static exchange rate fallback
  const amountInPaise = Math.round(amountInUSD * usdToInr * 100);

  if (isMockMode) {
    console.log(`[Payouts Mock] Creating payout for fund account ${fundAccountId} with amount $${amountInUSD} ($1 USD = ₹${usdToInr} INR)`);
    return {
      payoutId: `payout_mock_${Math.random().toString(36).slice(2, 10)}`,
      status: "processing",
    };
  }

  const payoutRes = await fetch("https://api.razorpay.com/v1/payouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({
      account_number: accountNumber,
      fund_account_id: fundAccountId,
      amount: amountInPaise,
      currency: "INR",
      mode: "IMPS",
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: referenceId,
    }),
  });

  if (!payoutRes.ok) {
    const errorBody = await payoutRes.text();
    throw new Error(`RazorpayX Payout creation failed: ${payoutRes.statusText} - ${errorBody}`);
  }

  const payoutData = (await payoutRes.json()) as { id: string; status: string; failure_reason?: string };
  return {
    payoutId: payoutData.id,
    status: mapRazorpayXStatus(payoutData.status),
    failureReason: payoutData.failure_reason,
  };
}

export async function getPayoutStatus(payoutId: string): Promise<PayoutResult> {
  if (isMockMode || payoutId.startsWith("payout_mock_")) {
    console.log(`[Payouts Mock] Fetching payout status for ${payoutId}`);
    return {
      payoutId,
      status: "successful", // mock payout resolves immediately to successful
    };
  }

  const payoutRes = await fetch(`https://api.razorpay.com/v1/payouts/${payoutId}`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!payoutRes.ok) {
    const errorBody = await payoutRes.text();
    throw new Error(`RazorpayX Payout fetch failed: ${payoutRes.statusText} - ${errorBody}`);
  }

  const payoutData = (await payoutRes.json()) as { id: string; status: string; failure_reason?: string };
  return {
    payoutId: payoutData.id,
    status: mapRazorpayXStatus(payoutData.status),
    failureReason: payoutData.failure_reason,
  };
}

function mapRazorpayXStatus(status: string): PayoutResult["status"] {
  switch (status.toLowerCase()) {
    case "processed":
      return "successful";
    case "failed":
      return "failed";
    case "reversed":
      return "reversed";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "failed";
    case "pending":
    case "queued":
    case "processing":
    default:
      return "processing";
  }
}
