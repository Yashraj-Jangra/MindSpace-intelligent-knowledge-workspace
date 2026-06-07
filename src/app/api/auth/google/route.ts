import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID || '178311275102-ph0shfc0dhs7cfnefre0q4bue6h0knvp.apps.googleusercontent.com';
  const redirectUri = `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/auth/google/callback`;

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid profile email')}&` +
    `access_type=offline&` +
    `prompt=consent`;

  return NextResponse.redirect(googleAuthUrl);
}
