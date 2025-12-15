import React from 'react';
import { AnalysisStats } from '../types';
import { GitFork, Star, BookOpen, Terminal } from 'lucide-react';

interface StatsCardsProps {
  stats: AnalysisStats;
}

const StatCard = ({ title, value, icon: Icon, subtext }: { title: string, value: string | number, icon: React.ElementType, subtext?: string }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col justify-between h-full hover:border-gray-300 transition-colors">
    <div className="flex items-start justify-between mb-4">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <Icon className="w-4 h-4 text-gray-400" />
    </div>
    <div>
      <div className="text-2xl font-semibold text-openai-black tracking-tight">{value}</div>
      {subtext && <p className="text-xs text-gray-400 mt-1 font-medium">{subtext}</p>}
    </div>
  </div>
);

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const topLang = stats.topLanguages[0]?.name || 'N/A';
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard 
        title="Active Repositories" 
        value={stats.totalRepos} 
        icon={BookOpen} 
        subtext="Starred public projects"
      />
      <StatCard 
        title="Total Stars" 
        value={stats.totalStars.toLocaleString()} 
        icon={Star} 
        subtext={`Avg. ${stats.avgStars} / repo`}
      />
      <StatCard 
        title="Total Forks" 
        value={stats.totalForks.toLocaleString()} 
        icon={GitFork} 
      />
      <StatCard 
        title="Top Language" 
        value={topLang} 
        icon={Terminal} 
      />
    </div>
  );
};