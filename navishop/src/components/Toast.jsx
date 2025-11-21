import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

const typeConfig = {
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    container: 'bg-blue-600 text-white'
  },
  error: {
    icon: <AlertTriangle className="w-5 h-5" />,
    container: 'bg-red-600 text-white'
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    container: 'bg-slate-800 text-white'
  }
};

const Toast = ({ toast }) => {
  if (typeof document === 'undefined' || !toast) return null;
  const config = typeConfig[toast.type] || typeConfig.info;

  return createPortal(
    <div
      className={`fixed top-6 right-6 z-[1200] shadow-2xl px-4 py-3 rounded-xl flex items-center space-x-3 ${config.container}`}
    >
      {config.icon}
      <span className="text-sm font-medium">{toast.message}</span>
    </div>,
    document.body
  );
};

export default Toast;
