import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataDir = path.join(process.cwd(), 'public', 'uploads');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const safeFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(dataDir, safeFilename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeFilename}`;

    return NextResponse.json({
      url: publicUrl,
      filename: safeFilename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('[Upload API Error]:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
