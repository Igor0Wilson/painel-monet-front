import { PendingFamilyInvite } from '../components/FamilyInviteModal';
import i18n from '../i18n';
import { formatCurrency, formatDateBr } from './formatters';

export interface DueExpenseReminderItem {
  id: string;
  expenseId: string;
  expenseName: string;
  amount: number;
  dueDate: string;
  kind: 'due_tomorrow' | 'due_today';
  alreadyDeviceNotified: boolean;
  emailSent: boolean;
}

const NOTIFIED_INVITES_STORAGE_KEY = 'pm_notified_invite_ids';
const NOTIFIED_DUE_STORAGE_KEY = 'pm_notified_due_ids';

function getStoredIdSet(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function addStoredId(storageKey: string, id: string): void {
  try {
    const set = getStoredIdSet(storageKey);
    set.add(id);
    localStorage.setItem(
      storageKey,
      JSON.stringify(Array.from(set).slice(-100)),
    );
  } catch {
    // Ignore storage errors
  }
}

function getNotifiedInviteIds(): Set<string> {
  return getStoredIdSet(NOTIFIED_INVITES_STORAGE_KEY);
}

function markInviteAsNotified(inviteId: string): void {
  addStoredId(NOTIFIED_INVITES_STORAGE_KEY, inviteId);
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

export async function notifyDueExpenseOnDevice(
  reminder: DueExpenseReminderItem,
): Promise<boolean> {
  if (typeof window === 'undefined' || !reminder?.id) return false;

  const alreadyNotified = getStoredIdSet(NOTIFIED_DUE_STORAGE_KEY);
  if (alreadyNotified.has(reminder.id) || reminder.alreadyDeviceNotified) {
    return false;
  }
  addStoredId(NOTIFIED_DUE_STORAGE_KEY, reminder.id);

  const isToday = reminder.kind === 'due_today';
  const formattedAmount = formatCurrency(Number(reminder.amount || 0));
  const formattedDate = formatDateBr(reminder.dueDate);
  const title = isToday
    ? i18n.t('modals.notifications.expenseDueTodayTitle')
    : i18n.t('modals.notifications.expenseDueTomorrowTitle');
  const body = isToday
    ? i18n.t('modals.notifications.expenseDueTodayBody', {
      name: reminder.expenseName,
      amount: formattedAmount,
      date: formattedDate,
    })
    : i18n.t('modals.notifications.expenseDueTomorrowBody', {
      name: reminder.expenseName,
      amount: formattedAmount,
      date: formattedDate,
    });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(isToday ? [300, 100, 300] : [200, 100, 200]);
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
          type: 'EXPENSE_DUE_NOTIFICATION',
          title,
          body,
          reminderId: reminder.id,
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
              icon: '/logo192.png?v=5',
              badge: '/favicon.png?v=5',
              tag: `expense-due-${reminder.id}`,
              requireInteraction: isToday,
              data: { url: '/dashboard', reminderId: reminder.id },
            } as NotificationOptions);
            return true;
          }
        }

        const notif = new Notification(title, {
          body,
          icon: '/logo192.png?v=5',
          tag: `expense-due-${reminder.id}`,
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
