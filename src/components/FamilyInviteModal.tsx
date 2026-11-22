import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaUsers,
  FaShieldAlt,
  FaCheckCircle,
  FaTimes,
  FaWhatsapp,
  FaExclamationTriangle,
} from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';
import { extractApiErrorMessage } from '../utils/errorHandler';
import { buildWhatsAppUrl } from '../utils/formatters';

export interface PendingFamilyInvite {
  id: string;
  inviterName: string;
  inviterMaskedCpf: string;
  inviterPhone?: string | null;
  groupName: string;
}

interface Props {
  invite: PendingFamilyInvite | null;
  onClose: () => void;
  onAccepted: () => void;
  onRejected: () => void;
}

const FamilyInviteModal: React.FC<Props> = ({
  invite,
  onClose,
  onAccepted,
  onRejected,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStep(1);
  }, [invite?.id]);

  if (!invite) return null;

  const waUrl = buildWhatsAppUrl(invite.inviterPhone);

  const handleReject = async () => {
    try {
      setLoading(true);
      await api.post(`/family/invites/${invite.id}/reject`);
      toast.info(t('familyInviteModal.rejectedToast'));
      onRejected();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('familyInviteModal.rejectError')));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAccept = async () => {
    try {
      setLoading(true);
      await api.post(`/family/invites/${invite.id}/accept`, { confirmed: true });
      toast.success(t('familyInviteModal.acceptedToast'));
      onAccepted();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('familyInviteModal.acceptError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exec-modal-overlay z-[90]">
      <div className="exec-modal-container max-w-md">
        {step === 1 ? (
          <>
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center">
                  {React.createElement(FaUsers as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {t('familyInviteModal.step1Title')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('familyInviteModal.step1Subtitle')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={t('common.close')}
              >
                {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {t('familyInviteModal.step1BodyUser')}{' '}
                <strong className="text-slate-950 dark:text-white">{invite.inviterName}</strong>{' '}
                {t('familyInviteModal.step1BodyCpf')}{' '}
                <strong className="tabular-nums text-slate-950 dark:text-white">
                  {invite.inviterMaskedCpf}
                </strong>{' '}
                {t('familyInviteModal.step1BodyAsk')}{' '}
                <strong>{t('familyInviteModal.step1BodyQuestion')}</strong>
              </p>

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-medium transition-colors"
                >
                  {React.createElement(FaWhatsapp as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                  {t('familyInviteModal.chatWhatsApp', { name: invite.inviterName })}
                </a>
              )}

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 p-3.5 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                {React.createElement(FaShieldAlt as unknown as React.ComponentType<{ className?: string }>, {
                  className: 'text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 flex-shrink-0',
                })}
                <span>
                  {t('familyInviteModal.step1NoticeBefore')}{' '}
                  <strong>{t('familyInviteModal.step1NoticeIndividual')}</strong>{' '}
                  {t('familyInviteModal.step1NoticeMiddle')}{' '}
                  <strong>{t('familyInviteModal.step1NoticeFamily')}</strong>.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={loading}
                  className="exec-btn-secondary text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                >
                  {t('familyInviteModal.declineBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="exec-btn-primary gap-2"
                >
                  {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                  {t('familyInviteModal.acceptStep1Btn')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {t('familyInviteModal.step2Title')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('familyInviteModal.step2Subtitle')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={t('common.close')}
              >
                {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong>{t('familyInviteModal.step2BodySure')}</strong>{' '}
                {t('familyInviteModal.step2BodyMiddle')}{' '}
                <strong className="text-slate-950 dark:text-white">{invite.inviterName}</strong>{' '}
                {t('familyInviteModal.step2BodyCpf')}{' '}
                <strong className="tabular-nums text-slate-950 dark:text-white">
                  {invite.inviterMaskedCpf}
                </strong>
                ?
              </p>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3.5 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                <p>{t('familyInviteModal.onConfirmTitle')}</p>
                <p>
                  {t('familyInviteModal.onConfirmBullet1Before')}{' '}
                  <strong>{t('familyInviteModal.onConfirmBullet1Strong')}</strong>{' '}
                  {t('familyInviteModal.onConfirmBullet1After')}
                </p>
                <p>{t('familyInviteModal.onConfirmBullet2')}</p>
                <p>
                  {t('familyInviteModal.onConfirmBullet3Before')}{' '}
                  <strong>{t('familyInviteModal.onConfirmBullet3Strong')}</strong>{' '}
                  {t('familyInviteModal.onConfirmBullet3After')}
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="exec-btn-secondary"
                >
                  {t('familyInviteModal.backBtn')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAccept}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                  {loading
                    ? t('familyInviteModal.joining')
                    : t('familyInviteModal.confirmFinalBtn')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FamilyInviteModal;
