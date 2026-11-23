import React from 'react';
import {
  Layers,
  Package,
  Tag,
  FolderKanban,
  History,
  Zap,
  Settings,
  LogOut,
} from 'lucide-react';
import { AppTab, User, CurrencyConfig } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  currentUser: User;
  onOpenQuickAction: () => void;
  onLogout: () => void;
  currencies: CurrencyConfig[];
  currentCurrency: CurrencyConfig;
  onSelectCurrency: (c: CurrencyConfig) => void;
  onOpenAccount: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenQuickAction,
  onLogout,
  currencies,
  currentCurrency,
  onSelectCurrency,
  onOpenAccount,
}) => {
  const getRoleLabel = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return 'المدير العام';
      case 'moderator':
        return 'مسؤول مبيعات / مودريتور';
      case 'production':
        return 'مسؤول تصنيع ومخزن';
      case 'shipping':
        return 'مسؤول شحن';
      case 'affiliate':
        return 'مسوّق بالعمولة';
    }
  };

  const canSeeDashboard =
    currentUser.role === 'admin' || currentUser.role === 'moderator' || currentUser.role === 'affiliate';
  const canSeeOrders = true; // كل الأدوار ترى الأوردرات (المحتوى يُقيَّد حسب الدور والبراندات)
  const canSeeCatalog =
    currentUser.role === 'admin' || currentUser.role === 'production' || currentUser.role === 'affiliate';
  const canSeeBrands =
    currentUser.role === 'admin' || currentUser.role === 'moderator' || currentUser.role === 'affiliate';
  const canSeeAudit = currentUser.role === 'admin';
  const canSeeSettings = currentUser.role === 'admin';

  return (
    <header className="no-print sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-base text-white">
              BF
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>براند فلو</span>
                <span className="text-[11px] font-mono text-indigo-300 font-semibold">
                  BrandFlow ERP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                إدارة الأوردرات والتصنيع والمخزون
              </p>
            </div>
          </div>

          {/* Zone 2: Role-Based Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {canSeeDashboard && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-800 text-indigo-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>الرئيسية</span>
              </button>
            )}

            {canSeeOrders && (
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'orders'
                    ? 'bg-slate-800 text-indigo-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>
                  {currentUser.role === 'production' ? 'أوردرات التصنيع والتجهيز' : 'الأوردرات'}
                </span>
              </button>
            )}

            {canSeeCatalog && (
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'catalog'
                    ? 'bg-slate-800 text-indigo-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <FolderKanban className="w-4 h-4" />
                <span>التصنيع والمخزن</span>
              </button>
            )}

            {canSeeBrands && (
              <button
                onClick={() => setActiveTab('brands')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'brands'
                    ? 'bg-slate-800 text-indigo-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span>البراندات</span>
              </button>
            )}

            {canSeeAudit && (
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'audit'
                    ? 'bg-slate-800 text-indigo-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>السجل</span>
              </button>
            )}

            {canSeeSettings && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'settings'
                    ? 'bg-slate-800 text-indigo-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>الإعدادات والفريق</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Quick Action, PWA Install, Currency, Logged-In User & Logout */}
          <div className="flex items-center gap-2">
            <PWAInstallButton variant="navbar" />

            <button
              onClick={onOpenQuickAction}
              title="المساعد السريع لتحديث الحالات"
              className="px-3 py-2 text-xs font-bold text-amber-200 bg-amber-950/70 border border-amber-700/60 rounded-lg hover:bg-amber-900/80 transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">تحديث سريع</span>
            </button>

            {currentUser.role !== 'production' && currentUser.role !== 'shipping' && (
              <select
                aria-label="اختر العملة"
                value={currentCurrency.code}
                onChange={(e) => {
                  const sel = currencies.find((c) => c.code === e.target.value);
                  if (sel) onSelectCurrency(sel);
                }}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono rounded-lg px-2 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {currencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol}
                  </option>
                ))}
              </select>
            )}

            {/* Logged-in User Display - يفتح صفحة حسابي */}
            <button
              onClick={onOpenAccount}
              title="حسابي - تعديل الاسم والإيميل وكلمة السر"
              className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-right hover:bg-slate-700/80 hover:border-indigo-500/60 transition-colors cursor-pointer"
            >
              <span className="text-base leading-none">{currentUser.avatar || '👤'}</span>
              <div>
                <div className="text-xs font-bold text-slate-100 leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-indigo-300 font-medium">
                  {getRoleLabel(currentUser.role)}
                </div>
              </div>
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="px-3 py-2 text-xs font-bold text-rose-200 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 rounded-lg transition-colors flex items-center gap-1.5"
              title="تسجيل الخروج من الحساب الحالي"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تسجيل خروج</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800 text-xs overflow-x-auto gap-1">
          {canSeeDashboard && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2 py-1.5 rounded whitespace-nowrap ${
                activeTab === 'dashboard' ? 'text-indigo-400 font-bold' : 'text-slate-400'
              }`}
            >
              الرئيسية
            </button>
          )}
          {canSeeOrders && (
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-2 py-1.5 rounded whitespace-nowrap ${
                activeTab === 'orders' ? 'text-indigo-400 font-bold' : 'text-slate-400'
              }`}
            >
              الأوردرات
            </button>
          )}
          {canSeeCatalog && (
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-2 py-1.5 rounded whitespace-nowrap ${
                activeTab === 'catalog' ? 'text-indigo-400 font-bold' : 'text-slate-400'
              }`}
            >
              التصنيع والمخزن
            </button>
          )}
          {canSeeBrands && (
            <button
              onClick={() => setActiveTab('brands')}
              className={`px-2 py-1.5 rounded whitespace-nowrap ${
                activeTab === 'brands' ? 'text-indigo-400 font-bold' : 'text-slate-400'
              }`}
            >
              البراندات
            </button>
          )}
          {canSeeAudit && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-2 py-1.5 rounded whitespace-nowrap ${
                activeTab === 'audit' ? 'text-indigo-400 font-bold' : 'text-slate-400'
              }`}
            >
              السجل
            </button>
          )}
          {canSeeSettings && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-2 py-1.5 rounded whitespace-nowrap ${
                activeTab === 'settings' ? 'text-indigo-400 font-bold' : 'text-slate-400'
              }`}
            >
              الإعدادات والفريق
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
