import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { RepositoryNode, AnalysisStats } from '../types';

// OpenAI-inspired palette: Green, Charcoal, Slate, Muted Blue, etc.
const COLORS = [
  '#10a37f', // OpenAI Green
  '#202123', // Charcoal
  '#6b7280', // Gray 500
  '#94a3b8', // Slate 400
  '#e5e7eb', // Gray 200 (visible enough)
  '#0f172a', // Slate 900
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-100 shadow-sm rounded text-xs">
        <p className="font-semibold text-gray-800 mb-0.5">{label}</p>
        <p className="text-gray-500">
          {`${payload[0].name}: ${payload[0].value.toLocaleString()}`}
        </p>
      </div>
    );
  }
  return null;
};

export const LanguagePieChart: React.FC<{ stats: AnalysisStats }> = ({ stats }) => {
  const data = stats.topLanguages.slice(0, 6);

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 h-[400px] flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-6">Languages</h3>
      <div className="flex-grow text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={110}
              paddingAngle={2}
              dataKey="count"
              nameKey="name"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Custom minimalist legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }}></span>
              <span className="text-gray-500">{entry.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const TopReposBarChart: React.FC<{ repos: RepositoryNode[] }> = ({ repos }) => {
  const data = [...repos]
    .sort((a, b) => b.stargazerCount - a.stargazerCount)
    .slice(0, 10)
    .map(r => ({
      name: r.nameWithOwner.split('/')[1],
      fullName: r.nameWithOwner,
      stars: r.stargazerCount,
    }));

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 h-[400px] flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-6">Most Popular Repositories</h3>
      <div className="flex-grow text-xs" style={{ overflow: 'visible' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={200}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              interval={0}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: '#f9fafb' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border border-gray-100 shadow-sm rounded text-xs">
                      <p className="font-semibold text-gray-800">{data.fullName}</p>
                      <p className="text-gray-500">Stars: {data.stars.toLocaleString()}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="stars" fill="#202123" radius={[0, 2, 2, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const LicenseChart: React.FC<{ stats: AnalysisStats }> = ({ stats }) => {
  const data = stats.licenseDistribution.slice(0, 5);

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 h-[320px] flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-6">Licenses</h3>
      <div className="flex-grow text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              interval={0}
              axisLine={false}
              tickLine={false}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <Tooltip cursor={{ fill: '#f9fafb' }} content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#10a37f" radius={[2, 2, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};