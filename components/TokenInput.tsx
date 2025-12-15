import React, { useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';

interface TokenInputProps {
  onAnalyze: (token: string) => void;
  loading: boolean;
  progressStr: string;
  error: string | null;
}

export const TokenInput: React.FC<TokenInputProps> = ({ onAnalyze, loading, progressStr, error }) => {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onAnalyze(token.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        {/* Logo / Brand Area */}
        <div className="mb-10 text-center">
          <div className="w-10 h-10 bg-openai-black rounded-full mx-auto mb-6 flex items-center justify-center">
             <div className="w-4 h-4 bg-white rounded-[1px]"></div>
          </div>
          <h1 className="text-3xl font-semibold text-openai-black mb-2 tracking-tight">
            Get started
          </h1>
          <p className="text-gray-500 text-sm">
            Enter your GitHub token to analyze the agents.md ecosystem
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative">
            <input
              type="password"
              id="token"
              className="w-full px-4 py-4 border border-gray-200 rounded-md text-base focus:outline-none focus:border-openai-green focus:ring-1 focus:ring-openai-green transition-all placeholder-gray-400 bg-white"
              placeholder="GitHub Personal Access Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className={`w-full flex items-center justify-center py-3.5 px-4 rounded-md text-base font-medium text-white bg-openai-green hover:bg-openai-green-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-openai-green transition-colors ${
              (loading || !token) ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                {progressStr || 'Connecting...'}
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center">
           <p className="text-xs text-gray-400">
             Token requires <strong>public_repo</strong> scope.
           </p>
           <a 
             href="https://github.com/settings/tokens" 
             target="_blank" 
             rel="noreferrer" 
             className="mt-2 inline-flex items-center text-xs text-openai-green hover:underline"
           >
             Generate new token <ArrowRight className="w-3 h-3 ml-1" />
           </a>
        </div>
      </div>
    </div>
  );
};