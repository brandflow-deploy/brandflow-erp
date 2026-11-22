import React, { useState } from 'react';
import { X, History, Search, Shield, Filter, Clock } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, logs }) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.userName.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      (l.orderNumber && l.orderNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">سجل العمليات والرقابة (Audit Trail)</h2>
              <p className="text-xs text-slate-300">
                تسجيل دقيق لكل العمليات: من أضاف الأوردر، من عدل الحالة، التاريخ والوقت
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الموظف أو رقم الأوردر أو نوع الإجراء..."
              className="w-full pr-9 pl-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
            />
          </div>
        </div>

        {/* Logs List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 text-xs">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              لا توجد عمليات مسجلة مطابقة للبحث
            </div>
          ) : (
            filtered.map((log) => (
              <div
                key={log.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/60 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.userName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                      {log.userRole === 'admin'
                        ? 'المدير العام'
                        : log.userRole === 'production'
                        ? 'تصنيع ومخزن'
                        : 'مودريتور'}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-indigo-600 font-bold">{log.action}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.timestamp).toLocaleString('ar-EG')}</span>
                  </div>
                </div>

                <div className="text-slate-700 leading-relaxed font-sans">{log.details}</div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>إجمالي العمليات المسجلة: {logs.length} عملية</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
