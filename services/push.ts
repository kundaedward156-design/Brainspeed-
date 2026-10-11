import * as Notifications from 'expo-notifications';
import { supabase } from '@/services/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(userId: string) {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (token && supabase) {
      // Store if column exists (add push_token to profiles if needed)
      await supabase.from('profiles').update({ push_token: token }).eq('id', userId).catch(() => {});
    }
    return token;
  } catch {
    return null;
  }
}
