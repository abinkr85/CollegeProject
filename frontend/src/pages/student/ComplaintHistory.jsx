import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ComplaintList from '../../components/complaint/ComplaintList';
import Navbar from '../../components/layout/Navbar';
import { useComplaintHistory } from '../../hooks/useComplaints';
import { Plus, Search, X } from 'lucide-react';

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'IT Support',
  'Cleaning',
  'Maintenance',
  'Administration',
  'Other'
];

function useDebouncedValue(value, delayMs) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timerId);
  }, [value, delayMs]);

  return debouncedValue;
}

export default function ComplaintHistory() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 400);

  const { data, isLoading, isFetching } = useComplaintHistory({
    status,
    search: debouncedSearch,
    category,
    priority,
    sortBy,
    sortOrder,
    page,
    limit: 6
  });

  const complaints = data?.complaints || [];
  const showHistoryLoading = isLoading || isFetching;
  const hasActiveFilters = Boolean(status || debouncedSearch || category || priority || sortBy !== 'createdAt');

  function handleClearFilters() {
    setStatus('');
    setCategory('');
    setPriority('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setSearchTerm('');
    setPage(1);
  }

  function handleSortChange(value) {
    const [field, order] = value.split('-');
    setSortBy(field || 'createdAt');
    setSortOrder(order || 'desc');
    setPage(1);
  }

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-gutter py-margin-desktop md:py-section-gap">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="font-display-lg text-display-lg text-primary mb-2 font-bold">Complaint History</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
              Track your filed complaints, filter by category, and view resolution updates.
            </p>
          </div>
          <button
            onClick={() => navigate('/submit')}
            className="bg-primary text-white border border-transparent rounded-xl px-5 py-3 font-semibold text-sm hover:bg-gray-800 hover:shadow-md transition-all flex items-center justify-center gap-2 w-full md:w-auto self-start shadow-sm cursor-pointer"
          >
            <Plus size={18} />
            File New Complaint
          </button>
        </div>

        {/* Controls: Search & Filters */}
        <div className="bg-surface-container-lowest border rounded-2xl p-4 mb-8 border-outline-variant/60 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search Bar */}
            <div className="relative w-full lg:w-96 flex-shrink-0">
              <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full h-[46px] pl-11 pr-4 bg-surface-container-low/50 hover:bg-surface border border-outline-variant/60 rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all placeholder:text-outline/70"
                placeholder="Search by title, location, or issue"
                type="text"
              />
            </div>

            {/* Status Filters */}
            <div className="flex gap-2 overflow-x-auto w-full no-scrollbar pb-1 lg:pb-0 items-center lg:justify-end">
              <span className="font-label-md text-label-md text-outline mr-2 flex-shrink-0 uppercase font-bold tracking-wider">
                Status:
              </span>
              <button
                onClick={() => {
                  setStatus('');
                  setPage(1);
                }}
                className={`flex-shrink-0 rounded-xl px-4 py-2 font-label-md text-label-md font-semibold transition-colors cursor-pointer border ${
                  status === ''
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/60 hover:bg-surface-container-low'
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setStatus('open');
                  setPage(1);
                }}
                className={`flex-shrink-0 rounded-xl px-4 py-2 font-label-md text-label-md font-semibold transition-colors cursor-pointer border ${
                  status === 'open'
                    ? 'bg-error-container text-on-error-container border-error-container/50 shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/60 hover:bg-surface-container-low'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => {
                  setStatus('in_progress');
                  setPage(1);
                }}
                className={`flex-shrink-0 rounded-xl px-4 py-2 font-label-md text-label-md font-semibold transition-colors cursor-pointer border ${
                  status === 'in_progress'
                    ? 'bg-secondary-fixed text-on-secondary-fixed border-secondary-fixed/50 shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/60 hover:bg-surface-container-low'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => {
                  setStatus('resolved');
                  setPage(1);
                }}
                className={`flex-shrink-0 rounded-xl px-4 py-2 font-label-md text-label-md font-semibold transition-colors cursor-pointer border ${
                  status === 'resolved'
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary-fixed-dim/50 shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/60 hover:bg-surface-container-low'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>

          {/* Secondary Controls: Category, Priority, Sort & Clear */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-outline-variant/40">
            {/* Category Dropdown */}
            <div className="w-44">
              <label htmlFor="history-category" className="sr-only">Category</label>
              <select
                id="history-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-xl border border-outline-variant/60 bg-white px-3 text-xs font-semibold text-on-surface shadow-xs focus:border-secondary focus:outline-none"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Priority Dropdown */}
            <div className="w-36">
              <label htmlFor="history-priority" className="sr-only">Priority</label>
              <select
                id="history-priority"
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-xl border border-outline-variant/60 bg-white px-3 text-xs font-semibold text-on-surface shadow-xs focus:border-secondary focus:outline-none"
              >
                <option value="">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            {/* Sort Order Dropdown */}
            <div className="w-40">
              <label htmlFor="history-sort" className="sr-only">Sort by</label>
              <select
                id="history-sort"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => handleSortChange(e.target.value)}
                className="h-10 w-full rounded-xl border border-outline-variant/60 bg-white px-3 text-xs font-semibold text-on-surface shadow-xs focus:border-secondary focus:outline-none"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="priority-desc">Urgency / Priority</option>
                <option value="status-asc">Status</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-outline-variant/60 bg-surface-container-low/40 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer ml-auto"
              >
                <X size={14} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Complaints Grid List */}
        <ComplaintList
          complaints={complaints}
          pagination={data?.pagination}
          isLoading={showHistoryLoading}
          onPageChange={setPage}
          emptyTitle={hasActiveFilters ? "No matching complaints found." : "No complaints submitted yet."}
          emptyDescription={hasActiveFilters ? "Try changing the search or status filter." : "File your first complaint so the admin team can review and take action."}
        />
      </main>
    </div>
  );
}
