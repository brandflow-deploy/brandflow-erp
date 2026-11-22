import React, { useState } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, Copy, Check, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (isInstalled) {
    return null;
  }

  const appUrl =
    typeof window !== 'undefined' ? window.location.origin : '';

  const handleActionClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    setShowGuideModal(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <>
      {variant === 'navbar' ? (
        <button
          type="button"
          onClick={handleActionClick}
          className="px-2.5 sm:px-3 py-2 text-xs font-bold text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/60 rounded-lg transition-colors flex items-center gap-1.5"
          title="تنزيل وتثبيت التطبيق على الموبايل"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">تنزيل على الفون</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleActionClick}
          className="w-full py-2.5 px-4 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>تنزيل وتثبيت النظام على الموبايل (كتطبيق)</span>
        </button>
      )}

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div
            dir="rtl"
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
          >
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">تنزيل وتثبيت BrandFlow ERP على الموبايل</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {isInIframe && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1.5">
                  <div className="font-bold">للتنزيل على الفون مباشرًة:</div>
                  <p className="leading-relaxed">
                    افتحي رابط النظام مباشرة في متصفح الموبايل (خارج شاشة المعاينة)، ثم ثبّتيه كتطبيق على الشاشة الرئيسية:
                  </p>
                </div>
              )}

              {/* App Link Copy Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-700">رابط فتح النظام على الموبايل:</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    dir="ltr"
                    value={appUrl}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700 text-left"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1 shrink-0"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الرابط</span>
                      </>
                    )}
                  </button>
                </div>
                {!isInIframe ? null : (
                  <a
                    href={appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>فتح في تبويب مستقل</span>
                  </a>
                )}
              </div>

              {/* Android Instructions */}
              {!isIOS && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                  <div className="font-bold text-emerald-900">على موبايل أندرويد (متصفح Chrome):</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 leading-relaxed">
                    <li>افتحي الرابط في متصفح <strong>Google Chrome</strong>.</li>
                    <li>اضغطي على زر <strong>«تنزيل على الفون»</strong> أو من قائمة المتصفح (⋮) اختاري <strong>«تثبيت التطبيق / Install app»</strong>.</li>
                    <li>سيظهر التطبيق بأيقونة <strong>BF</strong> على شاشة الهاتف ويعمل بالكامل مثل تطبيقات الموبايل.</li>
                  </ol>
                </div>
              )}

              {/* iPhone / iOS Instructions */}
              <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl space-y-1.5">
                <div className="font-bold text-sky-900">على الآيفون (متصفح Safari):</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 leading-relaxed">
                  <li>افتحي الرابط في متصفح <strong>Safari</strong>.</li>
                  <li className="flex items-center gap-1 flex-wrap">
                    <span>اضغطي على زر المشاركة</span>
                    <Share className="w-3.5 h-3.5 text-sky-700 inline" />
                    <span>في أسفل المتصفح.</span>
                  </li>
                  <li className="flex items-center gap-1 flex-wrap">
                    <span>انزلي للأسفل واختاري</span>
                    <PlusSquare className="w-3.5 h-3.5 text-sky-700 inline" />
                    <strong>«إضافة إلى الشاشة الرئيسية / Add to Home Screen»</strong>.
                  </li>
                </ol>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors"
              >
                فهمت، إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
