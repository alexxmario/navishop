import { useState, useEffect } from 'react';

const storageKey = 'cookieConsent';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const storedConsent = localStorage.getItem(storageKey);
    if (!storedConsent) {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(storageKey, 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 flex justify-center px-4 z-50">
      <div className="max-w-3xl w-full bg-white shadow-2xl border border-gray-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 text-sm text-gray-700">
          <p className="font-semibold text-gray-900 mb-1">Folosim cookie-uri</p>
          <p>
            Pentru a-ți oferi o experiență impecabilă folosim cookie-uri pentru analiză și funcționalități esențiale. Continuând, ești de acord cu politica noastră de cookie-uri.
          </p>
        </div>
        <button
          onClick={handleAccept}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-colors"
        >
          Accept cookie-urile
        </button>
      </div>
    </div>
  );
};

export default CookieBanner;
