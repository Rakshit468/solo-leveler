import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Calendar, TrendingUp, Target, Zap } from "lucide-react";
import { statsAPI } from "../services/api";
import StatCard from "../components/StatCard";
import LoadingSpinner from "../components/LoadingSpinner";

const COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
];

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(true);

  const periods = [
    { value: "7", label: "7 Days" },
    { value: "30", label: "30 Days" },
    { value: "90", label: "90 Days" },
  ];

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await statsAPI.getAnalytics({ period });
        setAnalytics(response.data.data);
      } catch (error) {
        console.error("Error loading analytics:", error);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Listen for analytics reload events
    const reloadHandler = () => fetchAnalytics();
    window.addEventListener("reload-analytics", reloadHandler);
    return () => {
      window.removeEventListener("reload-analytics", reloadHandler);
    };
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const xpOverTime = analytics?.xpOverTime || [];
  const categoryPerformance = analytics?.categoryPerformance || [];
  const streakData = analytics?.streakData || [];

  // Format XP over time data
  const formattedXpData = xpOverTime.map((item) => ({
    date: `${item._id.month}/${item._id.day}`,
    xp: item.totalXP,
    activities: item.count,
  }));

  // Format category data for pie chart
  const categoryPieData = categoryPerformance.map((item) => ({
    name: item.category,
    value: item.completed,
    total: item.total,
    rate: Math.round(item.completionRate),
  }));

  // Calculate streak visualization
  const streakVisualization = streakData.map((item) => ({
    date: `${item._id.month}/${item._id.day}`,
    active: item.hasActivity > 0 ? 1 : 0,
  }));

  // Calculate totals
  const totalXP = formattedXpData.reduce((sum, item) => sum + item.xp, 0);
  const totalActivities = formattedXpData.reduce(
    (sum, item) => sum + item.activities,
    0
  );
  const averageDaily = Math.round(
    totalXP / Math.max(formattedXpData.length, 1)
  );
  const activeDays = streakVisualization.filter((item) => item.active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Analytics</h1>
          <p className="text-gray-400 mt-2">
            Track your progress and identify patterns in your journey
          </p>
        </div>

        {/* Period Selector */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="input w-full sm:w-auto"
        >
          {periods.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total XP Earned"
          value={totalXP}
          subtitle={`Last ${period} days`}
          icon={Zap}
          color="primary"
        />
        <StatCard
          title="Activities Completed"
          value={totalActivities}
          subtitle={`${Math.round(
            totalActivities / Math.max(parseInt(period), 1)
          )} per day avg`}
          icon={Target}
          color="success"
        />
        <StatCard
          title="Daily Average XP"
          value={averageDaily}
          subtitle="XP per active day"
          icon={TrendingUp}
          color="secondary"
        />
        <StatCard
          title="Active Days"
          value={activeDays}
          subtitle={`${Math.round(
            (activeDays / parseInt(period)) * 100
          )}% of period`}
          icon={Calendar}
          color="warning"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* XP Over Time */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">XP Progress</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedXpData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value, name) => [
                    `${value} ${name === "xp" ? "XP" : "activities"}`,
                    name === "xp" ? "XP Earned" : "Activities",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="xp"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#8b5cf6", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Performance */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">
            Category Breakdown
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, rate }) => `${name}: ${rate}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryPieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value, name, props) => [
                    `${value}/${props.payload.total} completed`,
                    `${props.payload.name} (${props.payload.rate}%)`,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Activity Frequency */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">
            Daily Activities
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedXpData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value) => [`${value} activities`, "Completed"]}
                />
                <Bar
                  dataKey="activities"
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Activity Streak Heatmap */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">
            Activity Streak
          </h3>
          <div className="grid grid-cols-7 gap-1 h-64 content-start">
            {streakVisualization.map((day, index) => (
              <div
                key={index}
                className={`aspect-square rounded text-[10px] sm:text-xs flex items-center justify-center ${
                  day.active
                    ? "bg-success-500 text-white"
                    : "bg-dark-700 text-gray-500"
                }`}
                title={`${day.date}: ${day.active ? "Active" : "No activity"}`}
              >
                {day.active ? "✓" : "·"}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Green squares represent days with completed activities
          </p>
        </motion.div>
      </div>

      {/* Detailed Category Performance */}
      {categoryPerformance.length > 0 && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-xl font-semibold text-white mb-6">
            Category Performance Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryPerformance.map((category, index) => (
              <div
                key={category.category}
                className="bg-dark-700 rounded-lg p-4"
              >
                <h4 className="font-medium text-white mb-2 capitalize">
                  {category.category}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Completed:</span>
                    <span className="text-success-400">
                      {category.completed}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total:</span>
                    <span className="text-gray-300">{category.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Success Rate:</span>
                    <span className="text-primary-400">
                      {Math.round(category.completionRate)}%
                    </span>
                  </div>
                  <div className="progress-bar h-2 mt-3">
                    <div
                      className="progress-fill"
                      style={{ width: `${category.completionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Analytics;
