# PayPal Integration Setup

## Getting Your PayPal Client ID

1. **Go to PayPal Developer Portal**
   - Visit: https://developer.paypal.com/
   - Sign in with your PayPal account (or create one)

2. **Create an App**
   - Go to "My Apps & Credentials"
   - Click "Create App"
   - Give your app a name (e.g., "JewelryFit")
   - Select "Merchant" as the app type
   - Click "Create App"

3. **Get Your Client ID**
   - After creation, you'll see your **Client ID** on the app details page
   - You'll see two Client IDs:
     - **Sandbox** (for testing) - Use this during development
     - **Live** (for production) - Use this when deploying

4. **Add Client ID to Your Project**
   - Copy your Client ID
   - Add it to your `.env` file:
     ```
     VITE_PAYPAL_CLIENT_ID=your_client_id_here
     ```
   - For Vercel deployment, add it as an environment variable in your Vercel project settings

## Testing Payments (Sandbox Mode)

1. **Use Sandbox Client ID** during development
2. **Test PayPal Accounts**: Create test accounts at https://developer.paypal.com/dashboard/accounts
3. **Test Cards**: PayPal provides test credit cards for sandbox testing

## Going Live

1. **Switch to Live Client ID** in your environment variables
2. **Complete PayPal Business Account Verification**
3. **Test with small real transactions** before going fully live

## Supported Currencies

- USD (United States Dollar) - for English
- ILS (Israeli Shekel) - for Hebrew

The app automatically switches currency based on the selected language.

## Security Notes

- ✅ Client ID is safe to expose in frontend code
- ❌ Never expose your Secret Key in frontend code
- ✅ All payment processing happens through PayPal's secure servers
- ✅ No sensitive card data is handled by your application

## Pricing Structure

| Diamonds | USD  | ILS |
|----------|------|-----|
| 1        | $0.60| ₪2  |
| 3        | $1.50| ₪5  |
| 7        | $3.00| ₪10 |
| 20       | $6.00| ₪20 | ⭐ Best Value

Users start with **5 free diamonds** and each jewelry try-on costs **1 diamond**.
