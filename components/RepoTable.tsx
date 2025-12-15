import React, { useState, useMemo, useEffect } from 'react';
import { RepositoryNode } from '../types';
import { ArrowUpDown, ExternalLink, Download, Search, ChevronLeft, ChevronRight, ChevronDown, X, Check } from 'lucide-react';

interface RepoTableProps {
  repos: RepositoryNode[];
}

type SortField = 'stars' | 'forks' | 'updated' | 'activity';
const ITEMS_PER_PAGE = 50;

const TopicCombobox = ({ topics, selected, onSelect }: { topics: string[], selected: string[], onSelect: (t: string[]) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  // No need to reset query on selected change in multi-select mode, 
  // keeping it cleared allowing user to type next search.

  const filteredTopics = query === ''
    ? topics
    : topics.filter(t => t.toLowerCase().includes(query.toLowerCase()));

  const toggleTopic = (topic: string) => {
    if (selected.includes(topic)) {
      onSelect(selected.filter(t => t !== topic));
    } else {
      onSelect([...selected, topic]);
    }
  };

  const removeLast = () => {
    if (selected.length > 0) {
      onSelect(selected.slice(0, -1));
    }
  };

  return (
    <div className="relative w-full md:w-64 z-20">
      <div
        className="relative flex flex-wrap items-center gap-1.5 px-2 py-1.5 bg-transparent border border-gray-200 rounded-md text-sm focus-within:outline-none focus-within:border-openai-green focus-within:ring-1 focus-within:ring-openai-green min-h-[38px]"
        onClick={() => {
          // Focus input when container clicked
          document.getElementById('topic-input')?.focus();
          setIsOpen(true);
        }}
      >
        {selected.map(topic => (
          <span key={topic} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-medium">
            {topic}
            <X
              size={12}
              className="cursor-pointer hover:text-red-500"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                e.stopPropagation();
                toggleTopic(topic);
              }}
            />
          </span>
        ))}
        <input
          id="topic-input"
          type="text"
          className="flex-grow bg-transparent border-none outline-none text-gray-600 placeholder-gray-400 min-w-[60px]"
          placeholder={selected.length === 0 ? "Filter topics..." : ""}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && query === '') {
              removeLast();
            }
            if (e.key === 'Enter' && filteredTopics.length > 0) {
              // Select first match on enter
              toggleTopic(filteredTopics[0]);
              setQuery('');
            }
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 200);
          }}
        />
        <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto custom-scrollbar">
          {filteredTopics.map(topic => {
            const isSelected = selected.includes(topic);
            return (
              <div
                key={topic}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${isSelected ? 'bg-gray-50 text-openai-green font-medium' : 'text-gray-600'}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur allows multiple clicks
                  toggleTopic(topic);
                  setQuery('');
                  // Keep open for multi-select convenience
                }}
              >
                {topic}
                {isSelected && <Check size={14} />}
              </div>
            );
          })}
          {filteredTopics.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">No results</div>
          )}
        </div>
      )}
    </div>
  );
};

export const RepoTable: React.FC<RepoTableProps> = ({ repos }) => {
  const [sortField, setSortField] = useState<SortField>('stars');
  const [sortDesc, setSortDesc] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [minStars, setMinStars] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Extract all unique topics
  const allTopics = useMemo(() => {
    const topics = new Set<string>();
    repos.forEach(repo => {
      repo.repositoryTopics.nodes.forEach(node => {
        topics.add(node.topic.name);
      });
    });
    return Array.from(topics).sort();
  }, [repos]);

  // Filter and Sort Repos (All matching results)
  const sortedRepos = useMemo(() => {
    let result = [...repos];

    // Filtering
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(r =>
        r.nameWithOwner.toLowerCase().includes(lowerFilter) ||
        (r.description && r.description.toLowerCase().includes(lowerFilter))
      );
    }
    if (selectedTopics.length > 0) {
      result = result.filter(r =>
        selectedTopics.every(topic =>
          r.repositoryTopics.nodes.some(node => node.topic.name === topic)
        )
      );
    }
    if (minStars > 0) {
      result = result.filter(r => r.stargazerCount >= minStars);
    }

    // Sorting
    result.sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'stars': valA = a.stargazerCount; valB = b.stargazerCount; break;
        case 'forks': valA = a.forkCount; valB = b.forkCount; break;
        case 'activity':
          valA = a.issues.totalCount + a.pullRequests.totalCount;
          valB = b.issues.totalCount + b.pullRequests.totalCount;
          break;
        case 'updated':
          valA = new Date(a.updatedAt).getTime();
          valB = new Date(b.updatedAt).getTime();
          break;
        default: valA = 0; valB = 0;
      }
      return sortDesc ? valB - valA : valA - valB;
    });
    return result;
  }, [repos, sortField, sortDesc, filter, selectedTopics, minStars]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, selectedTopics, minStars]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedRepos.length / ITEMS_PER_PAGE);
  const paginatedRepos = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedRepos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedRepos, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDesc(!sortDesc);
    else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const downloadCSV = () => {
    const headers = ['Repository', 'URL', 'Description', 'Topics', 'Stars', 'Forks', 'Created', 'Updated'];
    // Export ALL sorted repos, not just the current page
    const rows = sortedRepos.map(r => [
      r.nameWithOwner,
      r.url,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${r.repositoryTopics.nodes.map(n => n.topic.name).join(';')}"`,
      r.stargazerCount,
      r.forkCount,
      r.createdAt,
      r.updatedAt
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'agents_analysis.csv';
    link.click();
  };

  const HeaderCell = ({ label, field }: { label: string, field: SortField }) => (
    <th
      className="px-6 py-4 cursor-pointer hover:text-openai-black transition-colors group select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-openai-green' : 'text-gray-300 group-hover:text-gray-400'}`} />
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Table Controls */}
      <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <h3 className="text-sm font-semibold text-gray-900">Repositories ({sortedRepos.length})</h3>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <TopicCombobox
            topics={allTopics}
            selected={selectedTopics}
            onSelect={setSelectedTopics}
          />

          <select
            value={minStars}
            onChange={(e) => setMinStars(Number(e.target.value))}
            className="px-3 py-2 bg-transparent border border-gray-200 rounded-md text-sm focus:outline-none focus:border-openai-green focus:ring-1 focus:ring-openai-green text-gray-600 w-full md:w-32"
          >
            <option value="0">All Stars</option>
            <option value="100">&gt; 100 Stars</option>
            <option value="500">&gt; 500 Stars</option>
            <option value="1000">&gt; 1k Stars</option>
            <option value="2000">&gt; 2k Stars</option>
            <option value="5000">&gt; 5k Stars</option>
            <option value="10000">&gt; 10k Stars</option>
          </select>

          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-transparent border border-gray-200 rounded-md text-sm focus:outline-none focus:border-openai-green focus:ring-1 focus:ring-openai-green placeholder-gray-400"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>

          <button
            onClick={downloadCSV}
            className="p-2 border border-gray-200 rounded-md text-gray-500 hover:text-openai-black hover:bg-gray-50 transition-colors"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto custom-scrollbar min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
              <th className="px-6 py-4 font-medium">Project</th>
              <HeaderCell label="Stars" field="stars" />
              <HeaderCell label="Forks" field="forks" />
              <HeaderCell label="Updated" field="updated" />
            </tr>
          </thead>
          <tbody className="text-sm text-gray-600">
            {paginatedRepos.map((repo) => (
              <tr key={repo.nameWithOwner} className="hover:bg-openai-light transition-colors group border-b border-gray-50 last:border-0">
                <td className="px-6 py-4 align-top max-w-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-openai-black hover:text-openai-green transition-colors flex items-center gap-1"
                    >
                      {repo.nameWithOwner}
                    </a>
                    <ExternalLink className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-gray-500 text-xs line-clamp-2 mb-2 leading-relaxed">{repo.description}</p>

                  <div className="flex flex-wrap gap-2">
                    {repo.primaryLanguage && (
                      <div className="flex items-center text-[10px] text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded bg-white">
                        <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: repo.primaryLanguage.color || '#ccc' }}></span>
                        {repo.primaryLanguage.name}
                      </div>
                    )}
                    {repo.repositoryTopics.nodes.slice(0, 3).map((n) => (
                      <span key={n.topic.name} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        #{n.topic.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-900">{repo.stargazerCount.toLocaleString()}</td>
                <td className="px-6 py-4">{repo.forkCount.toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(repo.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {paginatedRepos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                  No results found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {sortedRepos.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 bg-gray-50/30">
          <div>
            Showing <span className="font-medium text-gray-900">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedRepos.length)}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, sortedRepos.length)}</span> of <span className="font-medium text-gray-900">{sortedRepos.length}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
