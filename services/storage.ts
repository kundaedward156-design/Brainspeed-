/**
 * Reliable image upload for Expo / React Native → Supabase Storage
 */
import { supabase } from '@/services/supabase';

function guessExt(uri: string, mime?: string | null): string {
  const fromUri = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (fromUri && fromUri.length <= 5 && /^[a-z0-9]+$/.test(fromUri)) return fromUri;
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('webp')) return 'webp';
  if (mime?.includes('gif')) return 'gif';
  return 'jpg';
}

function contentTypeFor(ext: string, mime?: string | null): string {
  if (mime && mime.startsWith('image/')) return mime;
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

/**
 * Upload a local file URI (or existing https URL) to a public storage bucket.
 * Returns the public URL. Throws with the exact error message on failure.
 */
export async function uploadImageToBucket(
  bucket: 'banners' | 'rewards',
  imageUri: string,
  folder = ''
): Promise<string> {
  if (!supabase) throw new Error('Supabase is not connected.');
  if (!imageUri?.trim()) throw new Error('No image selected.');

  // Already a remote URL — reuse it
  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    return imageUri;
  }

  const response = await fetch(imageUri);
  if (!response.ok) {
    throw new Error(`Could not read image file (${response.status}). Try picking the image again.`);
  }

  const mime = response.headers.get('content-type');
  const ext = guessExt(imageUri, mime);
  const contentType = contentTypeFor(ext, mime);
  const arrayBuffer = await response.arrayBuffer();

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error('Image file is empty. Try another photo.');
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const path = folder ? `${folder}/${fileName}` : fileName;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType,
    upsert: false,
  });

  if (uploadError) {
    throw new Error(uploadError.message || 'Storage upload failed.');
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Upload succeeded but public URL is missing.');
  }

  return data.publicUrl;
}
