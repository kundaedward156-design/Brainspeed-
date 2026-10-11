/**
 * Reliable image upload for Expo / React Native → Supabase Storage
 */
import { supabase } from '@/services/supabase';
import { AppConfig } from '@/constants/config';
import * as FileSystem from 'expo-file-system';

function guessExt(uri: string): string {
  const fromUri = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (fromUri && fromUri.length <= 5 && /^[a-z0-9]+$/.test(fromUri)) return fromUri;
  return 'jpg';
}

function contentTypeFor(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

/**
 * Upload a local file URI to a public storage bucket.
 * Uses expo-file-system base64 (most reliable on Android).
 */
export async function uploadImageToBucket(
  bucket: 'banners' | 'rewards' | 'avatars',
  imageUri: string,
  folder = ''
): Promise<string> {
  if (!supabase) throw new Error('Supabase is not connected.');
  if (!imageUri?.trim()) throw new Error('No image selected.');

  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    return imageUri;
  }

  const ext = guessExt(imageUri);
  const contentType = contentTypeFor(ext);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const path = folder ? `${folder}/${fileName}` : fileName;

  // Read as base64 — works with content:// and file:// on Android
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!base64) throw new Error('Could not read the selected photo.');

  // Convert base64 to ArrayBuffer
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: true,
  });

  if (uploadError) {
    throw new Error(uploadError.message || 'Storage upload failed.');
  }

  const base = AppConfig.supabase.url?.replace(/\/$/, '');
  if (!base) throw new Error('Supabase URL is missing.');
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
