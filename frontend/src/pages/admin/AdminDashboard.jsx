import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getSummaryAnalytics,
  getByCategoryAnalytics,
  getMonthlyTrendAnalytics,
  getAllComplaints
} from '../../api/adminApi';
import { AlertCircle, BarChart3, Box, CheckCircle2, Clock3, ListChecks } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import MetricCard from '../../components/ui/MetricCard';
import ChartCard from '../../components/ui/ChartCard';
import RecentActivityFeed from '../../components/admin/RecentActivityFeed';
import ThreeDBarChart from '../../components/admin/charts/ThreeDBarChart';
import ThreeDDonutChart from '../../components/admin/charts/ThreeDDonutChart';

// Harmonious brand colors for status categories
const PIE_COLORS = {
  Open: '#ef4444',          // red-500
  'In Progress': '#f59e0b', // amber-500
  Resolved: '#10b981'       // emerald-500
};

export default function AdminDashboard() {
  const { accessToken } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [recent, setRecent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartMode, setChartMode] = useState('3d');

  const fetchData = (cancelled) => {
    setIsLoading(true);

    Promise.all([
      getSummaryAnalytics(),
      getByCategoryAnalytics(),
      getMonthlyTrendAnalytics(),
      getAllComplaints({ limit: 5 })
    ])
      .then(([summary, categories, trend, complaintsResult]) => {
        if (!cancelled) {
          setSummaryData(summary);
          setCategoryData(categories || []);
          setTrendData(trend || []);
          setRecent(complaintsResult?.complaints || []);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error('Failed to load dashboard data:', error);
        if (!cancelled) setIsLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    fetchData(cancelled);

    // Setup Server-Sent Events (SSE) for real-time updates
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const sseUrl = `${baseUrl}/api/realtime/admin${accessToken ? `?token=${accessToken}` : ''}`;
    const eventSource = new EventSource(sseUrl, { withCredentials: true });
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'COMPLAINT_CREATED' || data.type === 'COMPLAINT_UPDATED') {
          // Re-fetch data on real-time event without showing loading spinner for a seamless update
          fetchData(cancelled);
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      eventSource.close();
    };

    return () => {
      cancelled = true;
      eventSource.close();
    };
  }, [accessToken]);

  const openCount = summaryData?.statusDistribution?.OPEN ?? (summaryData?.pending ? Math.max(0, summaryData.pending - (summaryData?.statusDistribution?.IN_PROGRESS || 0)) : 0);
  const inProgressCount = summaryData?.statusDistribution?.IN_PROGRESS ?? 0;
  const resolvedCount = summaryData?.statusDistribution?.RESOLVED ?? summaryData?.resolved ?? 0;

  const sum = {
    total: summaryData?.total ?? 0,
    open: openCount,
    inProgress: inProgressCount,
    resolved: resolvedCount,
    avgResolutionTime: summaryData?.avgResolutionDays ? `${summaryData.avgResolutionDays} days` : '0 days'
  };

  const catData = categoryData;
  const statData = summaryData?.statusDistribution ? [
    { name: 'Open', value: openCount },
    { name: 'In Progress', value: inProgressCount },
    { name: 'Resolved', value: resolvedCount }
  ] : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
      
      {/* Page Header with 3D/2D View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#0a1422] tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">
            Monitor complaint activity, department workload, and resolution progress.
          </p>
        </div>

        {/* 3D / 2D View Switcher Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low/70 rounded-xl border border-outline-variant/60 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartMode('3d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              chartMode === '3d'
                ? 'bg-white text-secondary shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Interactive</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('2d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              chartMode === '2d'
                ? 'bg-white text-secondary shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>2D Classic</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Complaints"
          value={isLoading ? '...' : sum.total}
          icon={ListChecks}
          tone="blue"
          change="All complaints received from students."
        />
        <MetricCard
          label="Pending Review"
          value={isLoading ? '...' : sum.open}
          icon={AlertCircle}
          tone="amber"
          change="New complaints waiting for admin action."
        />
        <MetricCard
          label="In Progress"
          value={isLoading ? '...' : sum.inProgress}
          icon={Clock3}
          tone="indigo"
          change="Complaints currently assigned or being resolved."
        />
        <MetricCard
          label="Resolved Cases"
          value={isLoading ? '...' : sum.resolved}
          icon={CheckCircle2}
          tone="green"
          change="Complaints marked as resolved."
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart — Category */}
        <ChartCard
          title="Complaints by Category"
          description="Distribution of issues across campus categories"
          className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant/60 shadow-sm"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400 min-h-[260px]">Loading chart data...</div>
          ) : chartMode === '3d' ? (
            <ThreeDBarChart data={catData} barColor="#0058be" height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={catData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  cursor={{ fill: '#f8f9fa' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                />
                <Bar dataKey="count" fill="#0058be" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Donut Chart — Status */}
        <ChartCard
          title="Status Breakdown"
          description="Current resolution stage of all complaints"
          className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400 min-h-[260px]">Loading status breakdown...</div>
          ) : chartMode === '3d' ? (
            <ThreeDDonutChart data={statData} colors={PIE_COLORS} height={250} />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={statData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {statData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                    itemStyle={{ color: '#111827', fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Custom Legend */}
              <div className="flex justify-center gap-4 text-xs mt-3">
                {statData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 font-medium text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[entry.name] }} />
                    <span>{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
        {/* Line Chart — Trend */}
        <ChartCard
          title="Monthly Complaint Trend"
          description="Total new complaints logged over the past 6 months"
          className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant/60 shadow-sm"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400 min-h-[260px]">Loading trend history...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Complaints"
                  stroke="#0a1422"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0a1422', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#0a1422', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-1">
          <RecentActivityFeed complaints={recent} isLoading={isLoading} />
        </div>
      </div>
      
    </div>
  );
}
