# M-Pesa STK Push Integration Guide

This guide explains how to set up and use the M-Pesa STK (Sim Toolkit) Push integration for payment processing.

## Overview

The STK Push feature allows you to initiate M-Pesa payment prompts directly on customers' phones. When a customer selects M-Pesa as their payment method and enters their phone number, an STK push is automatically sent to their device.

## Setup Instructions

### 1. Obtain M-Pesa API Credentials

You need to register with Safaricom and obtain the following credentials:

- **Consumer Key**: OAuth consumer key from your Safaricom API account
- **Consumer Secret**: OAuth consumer secret
- **Business Short Code**: Your M-Pesa merchant business short code (e.g., 174379 for sandbox)
- **Pass Key**: Your M-Pesa pass key (provided by Safaricom)
- **Callback URL**: The URL where M-Pesa will send payment confirmation callbacks

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```env
# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASS_KEY=your_pass_key_here
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox  # or "production"
```

### 3. Sandbox Testing

For development/testing, use:
- **Business Short Code**: `174379`
- **Test Phone Numbers**: `254708374149`, `254701234567` (Safaricom provides test numbers)
- **Environment**: `sandbox`

### 4. Production Deployment

To go live:
1. Switch environment to `production` in `.env`
2. Update all credentials with production values
3. Ensure your callback URL is public and HTTPS
4. Update database to store `checkoutRequestId` with orders for payment verification

## How It Works

1. **Customer Checkout**: Customer selects M-Pesa and enters phone number
2. **Order Creation**: Order is created with pending payment status
3. **STK Push Initiated**: `/api/mpesa/stk-push` endpoint is called
4. **Phone Prompt**: M-Pesa prompt appears on customer's phone
5. **Payment Completion**: Customer enters M-Pesa PIN to complete payment
6. **Callback Received**: Safaricom sends payment confirmation to `/api/mpesa/callback`
7. **Order Status Updated**: Order status is updated to paid/processing

## API Endpoints

### POST /api/mpesa/stk-push

Initiates an STK push for M-Pesa payment.

**Request:**
```json
{
  "phoneNumber": "254712345678",
  "amount": 5000,
  "orderId": 123
}
```

**Response (Success):**
```json
{
  "success": true,
  "checkoutRequestID": "ws_CO_DMZ_...",
  "requestID": "29115-34620561-1",
  "responseCode": "0",
  "responseMessage": "Success. Request accepted for processing",
  "customerMessage": "Success. Request accepted for processing"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "errorMessage": "Error message from API"
}
```

### POST /api/mpesa/callback

Receives payment confirmation from Safaricom. This endpoint acknowledges the callback and processes the payment result.

**Callback Data (from Safaricom):**
```json
{
  "Body": {
    "stkCallback": {
      "MerchantCheckout": "...",
      "CheckoutRequestID": "ws_CO_DMZ_...",
      "ResultCode": 0,
      "ResultDesc": "The service request has been processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 5000 },
          { "Name": "MpesaReceiptNumber", "Value": "LK451A1A9E" },
          { "Name": "PhoneNumber", "Value": 254712345678 },
          { "Name": "TransactionDate", "Value": 20240101120000 }
        ]
      }
    }
  }
}
```

## Result Codes

- **0**: Payment successful
- **1**: User cancelled the operation
- **Other codes**: Payment failed - refer to ResultDesc for details

## Testing Checklist

- [ ] Environment variables configured in `.env`
- [ ] Sandbox credentials added
- [ ] Phone number is in correct format (254XXXXXXXXX)
- [ ] Test with provided Safaricom test numbers
- [ ] STK prompt appears on phone within 10 seconds
- [ ] Callback URL is accessible to Safaricom (test with webhook.site)
- [ ] Order status updates after payment completion

## Troubleshooting

### STK Push Not Appearing
- Check phone number format (should be 254XXXXXXXXX or 07XXXXXXXX)
- Verify credentials at Safaricom developer portal
- Check API environment (sandbox vs production mismatch)
- Ensure amount is a positive integer

### Callback Not Received
- Verify callback URL is public and HTTPS
- Check firewall/network settings
- Ensure Safaricom IPs are whitelisted (if applicable)
- Use https://webhook.site for testing

### Wrong Amount or Order Reference
- Verify order amount calculation includes all fees
- Check that orderId is correctly passed to STK push

## Security Considerations

1. **Never log credentials**: Avoid logging consumer key/secret
2. **HTTPS Only**: Always use HTTPS for callback URL
3. **Validate Callbacks**: Verify callback signatures (future enhancement)
4. **Store Securely**: Keep credentials in environment variables, not in code
5. **Rate Limiting**: Implement rate limiting on STK push endpoint

## Future Enhancements

- [ ] Store `checkoutRequestId` with order for payment verification
- [ ] Query transaction status endpoint
- [ ] Callback signature validation
- [ ] Retry logic for failed STK pushes
- [ ] Payment reconciliation batch jobs
- [ ] Webhook signature verification
