import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const BUCKET_NAME = 'form-visuals';

async function ensureBucket(supabaseClient: any) {
  const { data: buckets } = await supabaseClient.storage.listBuckets();
  const exists = buckets?.some((b: any) => b.name === BUCKET_NAME);
  if (!exists) {
    await supabaseClient.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024,
    });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const formId = params.id;

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseClient = createServerClient(token);

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: form } = await supabaseClient
    .from('forms')
    .select('id, user_id')
    .eq('id', formId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const kind = formData.get('kind') as string;

    if (!file || !kind) {
      return NextResponse.json({ error: 'Missing file or kind' }, { status: 400 });
    }

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowedTypes = kind === 'video' ? allowedVideoTypes : allowedImageTypes;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
      }, { status: 400 });
    }

    await ensureBucket(supabaseClient);

    const ext = file.name.split('.').pop() || (kind === 'video' ? 'mp4' : 'jpg');
    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const storagePath = `${formId}/${uniqueId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const url = publicUrlData?.publicUrl;
    if (!url) {
      return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 });
    }

    return NextResponse.json({
      url,
      storagePath,
      kind,
    });
  } catch (error: any) {
    console.error('Visual upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
