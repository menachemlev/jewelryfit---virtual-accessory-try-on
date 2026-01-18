import React, { useEffect, useState } from 'react';
import { backendService } from '../services/backendService';

interface BackendStatusProps {
  className?: string;
}

export const BackendStatus: React.FC<BackendStatusProps> = ({ className = '' }) => {
  const [config, setConfig] = useState(backendService.getBackendConfig());
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    if (!config.hasCloudRun) {
      setBackendOnline(false);
      return;
    }

    setChecking(true);
    try {
      const isOnline = await backendService.checkBackendHealth();
      setBackendOnline(isOnline);
    } catch (error) {
      setBackendOnline(false);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {/* Vercel API Status */}
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="text-gray-600 dark:text-gray-400">Vercel API</span>
      </div>

      {/* Cloud Run Backend Status */}
      {config.hasCloudRun && (
        <>
          <span className="text-gray-400">|</span>
          <div className="flex items-center gap-1">
            {checking ? (
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
            ) : (
              <div 
                className={`w-2 h-2 rounded-full ${
                  backendOnline ? 'bg-green-500' : 'bg-red-500'
                }`}
              ></div>
            )}
            <span className="text-gray-600 dark:text-gray-400">
              AI Backend {backendOnline === null ? '(checking...)' : backendOnline ? '✓' : '✗'}
            </span>
            {!checking && (
              <button
                onClick={checkBackend}
                className="ml-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
                title="Check backend status"
              >
                ↻
              </button>
            )}
          </div>
        </>
      )}

      {/* No Backend Warning */}
      {!config.hasCloudRun && (
        <>
          <span className="text-gray-400">|</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              AI Backend not configured
            </span>
            <a
              href="https://github.com/yourusername/jewelryfit-ai/blob/main/VERCEL_DEPLOYMENT.md"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
              title="See deployment guide"
            >
              ℹ
            </a>
          </div>
        </>
      )}
    </div>
  );
};
