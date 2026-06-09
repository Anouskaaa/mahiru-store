import { NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mahiru_admin_2024';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password diperlukan' },
        { status: 400 }
      );
    }

    if (password === ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true, message: 'Login berhasil' });

      response.cookies.set('admin_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Password salah' },
      { status: 401 }
    );
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}