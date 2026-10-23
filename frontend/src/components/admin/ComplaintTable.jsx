// src/components/admin/ComplaintTable.jsx
// Data table for Complaint Management page.
//
// Props:
//   complaints — array of complaint objects
//   isLoading  — boolean — shows skeleton rows when true
//   onRowClick — function(complaint) called when "View Details" or the row is clicked
//   isFiltered — boolean — indicates if active filters are applied

import { formatDate } from '../../utils/formatDate';
import { useSystemTimezone } from '../../context/TimezoneContext';
import PriorityBadge from '../ui/PriorityBadge';
import StatusBadge from '../ui/StatusBadge';
import { Eye, Inbox } from 'lucide-react';

/** Skeleton shown while data is loading. */
function TableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <tr key={i} className="border-b border-gray-100 last:border-0" aria-hidden="true">
          <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-gray-100 animate-pulse" /></td>
          <td className="px-5 py-4"><div className="h-4 w-48 rounded bg-gray-100 animate-pulse" /></td>
          <td className="px-5 py-4 hidden md:table-cell"><div className="h-4 w-32 rounded bg-gray-100 animate-pulse" /></td>
          <td className="px-5 py-4 hidden lg:table-cell"><div className="h-5 w-16 rounded-full bg-gray-100 animate-pulse" /></td>
          <td className="px-5 py-4"><div className="h-5 w-20 rounded-full bg-gray-100 animate-pulse" /></td>
          <td className="px-5 py-4 hidden sm:table-cell"><div className="h-4 w-24 rounded bg-gray-100 animate-pulse" /></td>
          <td className="px-5 py-4 text-right"><div className="h-8 w-8 ml-auto rounded bg-gray-100 animate-pulse" /></td>
        </tr>
      ))}
    </>
  );
}

/**
 * ComplaintTable — displays a list of complaints in a structured table.
 * Mobile responsive: wraps in overflow-x-auto and hides less critical columns on small screens.
 *
 * @param {{ complaints: Array, isLoading: boolean, onRowClick: (complaint) => void, isFiltered?: boolean }} props
 */
export default function ComplaintTable({ complaints = [], isLoading = false, onRowClick, isFiltered = false }) {
  const { timezone } = useSystemTimezone();

  return (
    <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-[#f8f9fa] text-xs uppercase tracking-wider text-gray-500 border-b border-[#e5e7eb]">
            <tr>
              <th scope="col" className="px-5 py-4 font-semibold">ID</th>
              <th scope="col" className="px-5 py-4 font-semibold min-w-[200px]">Title</th>
              <th scope="col" className="px-5 py-4 font-semibold hidden md:table-cell">Student</th>
              <th scope="col" className="px-5 py-4 font-semibold hidden lg:table-cell">Priority</th>
              <th scope="col" className="px-5 py-4 font-semibold">Status</th>
              <th scope="col" className="px-5 py-4 font-semibold hidden sm:table-cell">Date</th>
              <th scope="col" className="px-5 py-4 font-semibold text-right sr-only">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading ? (
              <TableSkeleton />
            ) : complaints.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 mb-3">
                      <Inbox size={24} className="text-gray-400" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {isFiltered ? "No matching complaints found." : "No complaints found."}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {isFiltered ? "Try clearing filters or changing your search." : "New student complaints will appear here when submitted."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              complaints.map((complaint) => (
                <tr
                  key={complaint.id}
                  className="group transition-colors hover:bg-gray-50 cursor-pointer"
                  onClick={() => onRowClick(complaint)}
                >
                  <td className="px-5 py-4 font-mono text-xs text-gray-400">
                    #{complaint.id.split('-')[0]}
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900 truncate max-w-[200px] xl:max-w-[300px]">
                    {complaint.title}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell truncate max-w-[160px]">
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <span className="truncate">{complaint.user?.name}</span>
                      {complaint.user?.idCardStatus === 'VERIFIED' && (
                        <span className="text-xs shrink-0" title="Verified Student ID">
                          🛡️
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <PriorityBadge priority={complaint.priority} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={complaint.status} />
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell whitespace-nowrap">
                    {formatDate(complaint.createdAt, timezone)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-white hover:text-[#0a1422] hover:shadow-sm hover:border border-[#e5e7eb] transition-all focus:outline-none focus:ring-2 focus:ring-[#0a1422] border-transparent"
                      aria-label={`View details for ${complaint.title}`}
                      onClick={(e) => {
                        e.stopPropagation(); // prevent double firing row click
                        onRowClick(complaint);
                      }}
                    >
                      <Eye size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
  );
}
