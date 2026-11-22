import { PendingFamilyInvite } from '../components/FamilyInviteModal';
import i18n from '../i18n';

const NOTIFIED_INVITES_STORAGE_KEY = 'pm_notified_invite_ids';

function getNotifiedInviteIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_INVITES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function markInviteAsNotified(inviteId: string): void {
  try {
    const set = getNotifiedInviteIds();
    set.add(inviteId);
    localStorage.setItem(
      NOTIFIED_INVITES_STORAGE_KEY,
      JSON.stringify(Array.from(set).slice(-50)),
    );
  } catch {
    // Ignore storage errors
  }
}

export async function requestDeviceNotificationPermission(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch {
    // Ignore permission prompt errors on unsupported browsers
  }
}

export async function notifyFamilyInviteOnDevice(
  invite: PendingFamilyInvite,
): Promise<boolean> {
  if (typeof window === 'undefined' || !invite?.id) return false;

  const alreadyNotified = getNotifiedInviteIds();
  if (alreadyNotified.has(invite.id)) {
    return false;
  }
  markInviteAsNotified(invite.id);

  const title = i18n.t('modals.notifications.familyInviteTitle');
  const body = i18n.t('modals.notifications.familyInviteBody', {
    name: invite.inviterName,
    cpf: invite.inviterMaskedCpf,
  });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([250, 120, 250]);
    }
  } catch {
    // Ignore vibration errors
  }

  try {
    const rnWebView = (
      window as unknown as {
        ReactNativeWebView?: { postMessage?: (msg: string) => void };
      }
    ).ReactNativeWebView;

    if (rnWebView && typeof rnWebView.postMessage === 'function') {
      rnWebView.postMessage(
        JSON.stringify({
          type: 'FAMILY_INVITE_NOTIFICATION',
          title,
          body,
          inviteId: invite.id,
        }),
      );
    }
  } catch {
    // Ignore WebView bridge errors
  }

  try {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted') {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && typeof registration.showNotification === 'function') {
            await registration.showNotification(title, {
              body,
              icon: '/logo192.png?v=4',
              badge: '/favicon.png?v=4',
              tag: `family-invite-${invite.id}`,
              requireInteraction: true,
              data: { url: '/dashboard', inviteId: invite.id },
            } as NotificationOptions);
            return true;
          }
        }

        const notif = new Notification(title, {
          body,
          icon: '/logo192.png?v=4',
          tag: `family-invite-${invite.id}`,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        return true;
      }
    }
  } catch {
    // Ignore notification errors
  }

  return true;
}
