import { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { settingsService } from '@/services/settings';
import { AppConfig } from '@/constants/config';
import type { AppLinks } from '@/types';

let cache: AppLinks | null = null;

/** Community / legal links, editable by admins in Admin → More → Links. */
export function useLinks() {
  const [links, setLinks] = useState<AppLinks>(cache ?? { ...AppConfig.defaultLinks });
  useEffect(() => {
    let alive = true;
    settingsService.getLinks().then(({ data }) => {
      cache = data;
      if (alive) setLinks(data);
    });
    return () => { alive = false; };
  }, []);
  return links;
}

export async function openLink(url: string | undefined, label: string) {
  if (!url?.trim()) {
    Alert.alert(label, 'This link has not been set up yet. Please check back soon.');
    return;
  }
  const target = /^(https?:|mailto:|tg:)/i.test(url) ? url : `https://${url}`;
  try {
    await Linking.openURL(target);
  } catch {
    Alert.alert(label, 'Could not open the link on this device.');
  }
}

export function openSupport(email: string | undefined) {
  return openLink(email ? `mailto:${email}` : '', 'Support');
}
