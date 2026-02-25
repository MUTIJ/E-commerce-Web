/**
 * M-Pesa STK Push Integration
 * Handles M-Pesa payment processing including STK push for payment prompts
 */

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  callbackUrl: string;
  environment: "sandbox" | "production";
}

interface STKPushPayload {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDescription: string;
}

interface STKPushResponse {
  success: boolean;
  checkoutRequestID?: string;
  requestID?: string;
  responseCode?: string;
  responseMessage?: string;
  customerMessage?: string;
  errorMessage?: string;
}

/**
 * Get M-Pesa configuration from environment variables
 */
export function getMpesaConfig(): MpesaConfig {
  return {
    consumerKey: process.env.MPESA_CONSUMER_KEY || "",
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
    businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE || "174379",
    passkey: process.env.MPESA_PASS_KEY || "",
    callbackUrl: process.env.MPESA_CALLBACK_URL || "https://yourapp.com/api/mpesa/callback",
    environment: (process.env.MPESA_ENVIRONMENT as "sandbox" | "production") || "sandbox",
  };
}

/**
 * Get M-Pesa access token
 */
async function getAccessToken(config: MpesaConfig): Promise<string> {
  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  const url = config.environment === "sandbox"
    ? "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    : "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("M-Pesa token error:", error);
    throw new Error("Failed to authenticate with M-Pesa");
  }
}

/**
 * Initiate STK push for M-Pesa payment
 */
export async function initiateStkPush(payload: STKPushPayload): Promise<STKPushResponse> {
  const config = getMpesaConfig();

  // Validate M-Pesa credentials
  if (!config.consumerKey || !config.consumerSecret || !config.businessShortCode || !config.passkey) {
    return {
      success: false,
      errorMessage: "M-Pesa credentials not configured",
    };
  }

  try {
    const accessToken = await getAccessToken(config);

    // Format phone number: ensure it's in 254XXXXXXXXX format
    let formattedPhone = payload.phoneNumber.replace(/^0/, "254");
    if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[:-]/g, "").split(".")[0];

    // Generate password: Base64(BusinessShortCode + Passkey + Timestamp)
    const password = Buffer.from(
      `${config.businessShortCode}${config.passkey}${timestamp}`
    ).toString("base64");

    const url = config.environment === "sandbox"
      ? "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
      : "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

    const requestBody = {
      BusinessShortCode: config.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.floor(payload.amount), // Ensure integer
      PartyA: formattedPhone,
      PartyB: config.businessShortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: config.callbackUrl,
      AccountReference: payload.accountReference,
      TransactionDesc: payload.transactionDescription,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data: any = await response.json();

    if (data.ResponseCode === "0") {
      return {
        success: true,
        checkoutRequestID: data.CheckoutRequestID,
        requestID: data.RequestId,
        responseCode: data.ResponseCode,
        responseMessage: data.ResponseMessage,
        customerMessage: data.CustomerMessage,
      };
    } else {
      return {
        success: false,
        responseCode: data.ResponseCode,
        errorMessage: data.errorMessage || data.ResponseDescription || "STK push failed",
      };
    }
  } catch (error) {
    console.error("STK push error:", error);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "Failed to initiate STK push",
    };
  }
}

/**
 * Verify M-Pesa transaction status
 */
export async function checkTransactionStatus(checkoutRequestId: string): Promise<any> {
  const config = getMpesaConfig();

  if (!config.consumerKey || !config.consumerSecret) {
    throw new Error("M-Pesa credentials not configured");
  }

  try {
    const accessToken = await getAccessToken(config);
    const timestamp = new Date().toISOString().replace(/[:-]/g, "").split(".")[0];
    const password = Buffer.from(
      `${config.businessShortCode}${config.passkey}${timestamp}`
    ).toString("base64");

    const url = config.environment === "sandbox"
      ? "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"
      : "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error("Transaction status check error:", error);
    throw error;
  }
}
