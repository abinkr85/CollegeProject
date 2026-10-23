import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllComplaints, updateComplaint, exportCSV } from '../../api/adminApi';
import { Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

import ComplaintFilters from '../../components/admin/ComplaintFilters';
import ComplaintTable from '../../components/admin/ComplaintTable';
import PaginationControls from '../../components/admin/PaginationControls';
import ComplaintDetailPanel from '../../components/admin/ComplaintDetailPanel';

export default function ComplaintManagement() {
  const [searchParams] = useSearchParams();
  const { accessToken } = useAuth();

  // --- State ---
  const [data, setData] = useState({ complaints: [], totalCount: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter state (drives the API fetch, initialized from URL search params if present)
  const [filters, setFilters] = useState(() => ({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    category: searchParams.get('category') || '',
    page: Number(searchParams.get('page')) || 1,
    limit: 10
  }));

  // Sync state if URL query params change while mounted
  useEffect(() => {
    const urlSearch = searchParams.get('search') ?? '';
    const urlStatus = searchParams.get('status') ?? '';
    const urlPriority = searchParams.get('priority') ?? '';
    const urlCategory = searchParams.get('category') ?? '';

    setFilters(prev => {
      if (
        prev.search === urlSearch &&
        prev.status === urlStatus &&
        prev.priority === urlPriority &&
        prev.category === urlCategory
      ) {
        return prev;
      }
      return {
        ...prev,
        search: urlSearch,
        status: urlStatus,
        priority: urlPriority,
        category: urlCategory,
        page: 1
      };
    });
  }, [searchParams]);

  // Selected complaint for the detail panel
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // --- Fetch Logic ---
  const loadComplaints = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);

    getAllComplaints(filters).then((result) => {
      if (!cancelled) {
        setData({
          complaints: result.complaints,
          totalCount: result.pagination?.total || 0,
          totalPages: result.pagination?.totalPages || 1
        });
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error('Failed to load complaints:', err);
      if (!cancelled) setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [filters]);

  // Fetch complaints whenever filters change
  useEffect(() => {
    loadComplaints();
  }, [filters, loadComplaints]);

  // Subscribe to real-time events via SSE
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const sseUrl = `${baseUrl}/api/realtime/admin${accessToken ? `?token=${accessToken}` : ''}`;
    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'COMPLAINT_CREATED' || data.type === 'COMPLAINT_UPDATED') {
          loadComplaints();
        }
      } catch (err) {
        console.error('Failed to parse SSE event in ComplaintManagement:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error in ComplaintManagement:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [accessToken, loadComplaints]);

  // --- Handlers ---
  function handlePageChange(newPage) {
    setFilters((prev) => ({ ...prev, page: newPage }));
  }

  // Row selection handler
  const handleRowClick = useCallback((complaint) => {
    setSelectedComplaint(complaint);
  }, []);

  function closePanel() {
    setSelectedComplaint(null);
  }

  async function handleSaveComplaint(id, changes) {
    await updateComplaint(id, changes);
    // Re-fetch the list to see updated status in the table immediately
    loadComplaints();
    closePanel();
  }

  function handleExportCsv() {
    exportCSV(filters);
  }

  const isFiltered = Boolean(filters.search || filters.status || filters.priority || filters.category);

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1422] tracking-tight">Complaint Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Search, review, assign, and update student complaints.
          </p>
        </div>
        
        {/* Export Button */}
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={isLoading || data.complaints.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a1422] disabled:opacity-50 transition-all cursor-pointer"
        >
          <Download size={16} aria-hidden="true" />
          Export CSV
        </button>
      </div>

      {/* Filters Area */}
      <ComplaintFilters
        filters={filters}
        setFilters={setFilters}
        isLoading={isLoading}
      />

      {/* Main Table Area */}
      <div className="flex flex-col bg-white rounded-2xl border border-outline-variant/60 shadow-xs overflow-hidden">
        <ComplaintTable
          complaints={data.complaints}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          isFiltered={isFiltered}
        />
        <div className="border-t border-gray-100 p-3 sm:px-4 bg-gray-50/50">
          <PaginationControls
            currentPage={filters.page}
            totalPages={data.totalPages}
            totalCount={data.totalCount}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Slide-over Detail Panel */}
      <ComplaintDetailPanel
        complaint={selectedComplaint}
        onClose={closePanel}
        onSave={handleSaveComplaint}
      />
      
    </div>
  );
}
