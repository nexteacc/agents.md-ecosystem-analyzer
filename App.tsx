import React, { useState, useEffect, useMemo } from 'react';
import { StatsCards } from './components/StatsCards';
import { LanguagePieChart, TopReposBarChart } from './components/Charts';
import { RepoTable } from './components/RepoTable';
import { RepositoryNode, AnalysisStats } from './types';
import { fetchEcosystemData } from './services/githubService';
import { Loader2, CalendarClock } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState<RepositoryNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const data = await fetchEcosystemData();
        setRepos(data.repos);
        setLastUpdated(data.timestamp);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load ecosystem data. The server might be busy or rate-limited.");
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Stats Calculation
  const stats: AnalysisStats = useMemo(() => {
    if (repos.length === 0) return { totalRepos: 0, totalStars: 0, totalForks: 0, avgStars: 0, topLanguages: [], topTopics: [], licenseDistribution: [] };

    const totalStars = repos.reduce((sum, r) => sum + r.stargazerCount, 0);
    const totalForks = repos.reduce((sum, r) => sum + r.forkCount, 0);

    const langMap = new Map<string, { count: number, color?: string }>();
    const topicMap = new Map<string, number>();
    const licenseMap = new Map<string, number>();

    repos.forEach(r => {
      const langName = r.primaryLanguage?.name || 'Unknown';
      const curLang = langMap.get(langName) || { count: 0, color: r.primaryLanguage?.color };
      langMap.set(langName, { count: curLang.count + 1, color: curLang.color });

      r.repositoryTopics.nodes.forEach(n => {
        topicMap.set(n.topic.name, (topicMap.get(n.topic.name) || 0) + 1);
      });

      const licName = r.licenseInfo?.spdxId || r.licenseInfo?.name || 'No License';
      licenseMap.set(licName, (licenseMap.get(licName) || 0) + 1);
    });

    return {
      totalRepos: repos.length,
      totalStars,
      totalForks,
      avgStars: Math.round(totalStars / repos.length),
      topLanguages: Array.from(langMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count),
      topTopics: Array.from(topicMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 20),
      licenseDistribution: Array.from(licenseMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    };
  }, [repos]);

  const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="w-10 h-10 bg-openai-black rounded-full mb-6 flex items-center justify-center animate-pulse">
         <div className="w-4 h-4 bg-white rounded-[1px]"></div>
      </div>
      <h2 className="text-xl font-semibold text-openai-black mb-2">Analyzing Ecosystem</h2>
      <p className="text-gray-500 text-sm max-w-md text-center mb-6">
        Retrieving the latest AGENTS.md data from our daily cache...
      </p>
      <Loader2 className="w-6 h-6 text-openai-green animate-spin" />
    </div>
  );

  const ErrorScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
       <div className="p-4 bg-red-50 rounded-lg border border-red-100 max-w-md text-center">
         <h2 className="text-red-800 font-semibold mb-2">Unavailable</h2>
         <p className="text-red-600 text-sm">{error}</p>
         <button 
           onClick={() => window.location.reload()} 
           className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-700 rounded text-sm hover:bg-red-50 transition-colors"
         >
           Try Again
         </button>
       </div>
    </div>
  );

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen />;

  return (
    <div className="min-h-screen bg-white text-openai-black">
      {/* Navbar */}
      <header className="border-b border-gray-100 sticky top-0 z-10 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-center relative">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-openai-black rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-[1px]"></div>
            </div>
            <span className="font-semibold tracking-tight">Agents.md Dashboard</span>
          </div>
          <div className="absolute right-6 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Updated: {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'Today'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
           <h1 className="text-3xl font-bold text-openai-black mb-2 tracking-tight">Agents.md Projects</h1>
           <p className="text-gray-500">
             Public projects integrating Agents.md 
           </p>
        </div>

        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TopReposBarChart repos={repos} />
          <LanguagePieChart stats={stats} />
        </div>
        
        <div className="mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 flex flex-col h-[320px]">
             <h3 className="text-sm font-semibold text-gray-900 mb-4">Trending Topics</h3>
             <div className="flex flex-wrap gap-2 overflow-y-auto custom-scrollbar content-start">
               {stats.topTopics.map((topic) => (
                 <span 
                    key={topic.name} 
                    className="px-2.5 py-1 rounded text-xs text-gray-600 bg-gray-50 border border-gray-100"
                 >
                   #{topic.name} <span className="text-gray-400 ml-1">{topic.count}</span>
                 </span>
               ))}
             </div>
          </div>
        </div>

        <RepoTable repos={repos} />
      </main>
    </div>
  );
};

export default App;