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
  Sector,
  LineChart,
  Line,
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
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

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
              activeIndex={activeIndex}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              isAnimationActive={true}
              animationDuration={300}
              activeShape={(props: any) => {
                const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                return (
                  <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 6}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                    stroke="none"
                    style={{ 
                      transition: 'all 0.3s ease',
                      outline: 'none',
                      stroke: 'none'
                    }}
                  />
                );
              }}
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
      <h3 className="text-sm font-semibold text-gray-900 mb-6">AGENTS.md Cases</h3>
      <div className="flex-grow text-xs" style={{ overflow: 'visible' }}>
        {/* Style to remove focus outline from recharts wrapper */}
        <style dangerouslySetInnerHTML={{
          __html: `
          .recharts-wrapper:focus {
            outline: none !important;
          }
        `}} />
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
              interval={0}
              axisLine={false}
              tickLine={false}
              tick={({ x, y, payload }) => {
                // Custom clickable tick
                const repo = data.find(d => d.name === payload.value);
                return (
                  <g transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }}>
                    <text
                      x={0}
                      y={0}
                      dy={4}
                      textAnchor="end"
                      fill="#6b7280"
                      fontSize={11}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Find full repo data to get fullName
                        if (repo) {
                          // Use exact path from data if available (need to cast or access prop safely)
                          // @ts-ignore - agentsMdPath exists on repo node
                          const filePath = repo.agentsMdPath || 'AGENTS.md';
                          window.open(`https://github.com/${repo.fullName}/blob/HEAD/${filePath}`, '_blank');
                        }
                      }}
                      className="hover:fill-blue-600 hover:underline"
                    >
                      {payload.value}
                    </text>
                  </g>
                );
              }}
            />
            <Tooltip
              cursor={{ fill: '#f9fafb', cursor: 'pointer' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border border-blue-100 shadow-sm rounded text-xs">
                      <p className="font-semibold text-gray-800">{data.fullName}</p>
                      <p className="text-gray-500 mb-1">Stars: {data.stars.toLocaleString()}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="stars"
              fill="#202123"
              radius={[0, 2, 2, 0]}
              barSize={16}
            // Removed cursor pointer and click handler
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const TopTopicsBarChart: React.FC<{ stats: AnalysisStats }> = ({ stats }) => {
  const data = stats.topTopics.slice(0, 15).map(topic => ({
    name: topic.name,
    count: topic.count,
  }));

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 h-[320px] flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-6">Top Topics</h3>
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
              width={150}
              interval={0}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: '#f9fafb' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border border-gray-100 shadow-sm rounded text-xs">
                      <p className="font-semibold text-gray-800 mb-1">#{data.name}</p>
                      <p className="text-gray-500">Repositories: {data.count.toLocaleString()}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="count"
              fill="#202123"
              radius={[0, 2, 2, 0]}
              barSize={16}
            />
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

export const AdoptionTrendChart: React.FC<{ repos: RepositoryNode[] }> = ({ repos }) => {
  const [timeRange, setTimeRange] = React.useState<'week' | 'month'>('week');

  // Calculate data based on selected time range (week or month)
  // Data is read from JSON and filtered by repository creation date
  const getTrendData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dataPoints: Array<{ date: string; fullDate: string; count: number }> = [];

    if (timeRange === 'week') {
      // Week view: Last 7 days, daily breakdown
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        // Count repositories created on this day
        const count = repos.filter(repo => {
          const repoDate = new Date(repo.createdAt);
          return repoDate >= date && repoDate < nextDate;
        }).length;

        // Format date: Dec 15
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        dataPoints.push({
          date: dateStr,
          fullDate: date.toISOString().split('T')[0],
          count,
        });
      }
    } else {
      // Month view: Last 30 days, daily breakdown
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        // Count repositories created on this day
        const count = repos.filter(repo => {
          const repoDate = new Date(repo.createdAt);
          return repoDate >= date && repoDate < nextDate;
        }).length;

        // Format date: Dec 15
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        dataPoints.push({
          date: dateStr,
          fullDate: date.toISOString().split('T')[0],
          count,
        });
      }
    }

    return dataPoints;
  };

  const data = getTrendData();

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 h-[320px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-900">New Projects Integrating Trend</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              timeRange === 'week'
                ? 'bg-openai-green text-white border-openai-green'
                : 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              timeRange === 'month'
                ? 'bg-openai-green text-white border-openai-green'
                : 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Month
          </button>
        </div>
      </div>
      <div className="flex-grow text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={timeRange === 'month' ? 4 : 0} // Show every 5th label for month view
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: '#202123', strokeWidth: 1, strokeDasharray: '5 5' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border border-gray-100 shadow-sm rounded text-xs">
                      <p className="font-semibold text-gray-800 mb-1">{data.fullDate}</p>
                      <p className="text-gray-900 font-medium">
                        New Projects: {data.count}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#202123"
              strokeWidth={2}
              dot={{ fill: '#202123', r: 4 }}
              activeDot={{ r: 6, fill: '#202123' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};