import { NextResponse } from 'next/server';
import { findUserByEmail, createUser, countUsers } from '@/lib/auth-storage';
import { createSessionToken, setSessionCookie } from '@/lib/session';

export async function GET(req: Request) {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
      console.error('[Google OAuth Callback Error]:', error);
      return NextResponse.redirect(`${baseUrl}/login?error=Google authentication was cancelled`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth client credentials are not configured in environment variables');
    }

    // 1. Exchange authorization code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Google userInfo API
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      throw new Error('Failed to fetch user profile from Google');
    }

    const googleUser = await userRes.json();
    const { email, name, picture } = googleUser;

    if (!email) {
      throw new Error('No email returned from Google profile');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 3. Find or Create User
    let user = await findUserByEmail(normalizedEmail);

    if (!user) {
      const totalUsers = await countUsers();
      const role = totalUsers === 0 ? 'ADMIN' : 'USER';

      user = await createUser({
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        image: picture,
        role,
      });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
    };

    // 4. Create Session Token & Set HTTP-only Cookie
    const token = createSessionToken(sessionUser);
    await setSessionCookie(token);

    return NextResponse.redirect(`${baseUrl}/`);
  } catch (err) {
    console.error('[Google Callback Exception]:', err);
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent((err as Error).message)}`);
  }
}
