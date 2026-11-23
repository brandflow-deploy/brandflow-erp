import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { API_BASE } from './lib/api';
import './index.css';

// في نسخة المرآة على supabase.co تُقدَّم الصفحة تحت /functions/v1/mirror
// فنحوّل طلبات /api المطلقة لتمر عبر نفس المسار (تُمرَّر للخادم الأصلي).
if (API_BASE) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return originalFetch(`${API_BASE}${input}`, init);
    }
    return originalFetch(input, init);
  };
}

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
