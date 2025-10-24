# Supabase Edge Functions

## Setup

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project**:
   ```bash
   supabase link --project-ref orqsmybwoiswwngzrgvq
   ```

## Deploy the send-email Function

1. **Set the Resend API key as a secret**:
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key_here
   ```
   
   Replace `your_resend_api_key_here` with your actual Resend API key from the admin dashboard settings.

2. **Deploy the function**:
   ```bash
   supabase functions deploy send-email
   ```

3. **Verify deployment**:
   - Go to your Supabase dashboard
   - Navigate to Edge Functions
   - You should see `send-email` listed as deployed

## Testing

Test the function using curl:
```bash
curl -i --location --request POST 'https://orqsmybwoiswwngzrgvq.supabase.co/functions/v1/send-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"to":"test@example.com","subject":"Test Email","html":"<p>This is a test</p>"}'
```

## Function Details

### send-email

**Purpose**: Sends emails via Resend API (server-side to avoid CORS issues and protect API key)

**Endpoint**: `https://orqsmybwoiswwngzrgvq.supabase.co/functions/v1/send-email`

**Method**: POST

**Request Body**:
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "<p>Email HTML content</p>",
  "from": "OpServe Safety Group <noreply@opservesafetygroup.com>",
  "replyTo": "optional-reply@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "email-id-from-resend"
  }
}
```

**Error Response**:
```json
{
  "error": "Error message"
}
```

## Environment Variables

The function requires the following secret:
- `RESEND_API_KEY` - Your Resend API key for sending emails

## Notes

- The function automatically handles CORS for browser requests
- API key is stored securely as a Supabase secret, not exposed to client
- Errors are logged but won't crash the client-side submission process
