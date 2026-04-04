"use client";

import type { VisualizationSpec } from "@/lib/claude/agent";
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
  Legend,
} from "recharts";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

interface Props {
  spec: VisualizationSpec;
}

export function VisualizationRenderer({ spec }: Props) {
  const { type, title, data, x_key, y_key, format } = spec;

  const formatValue = (v: number) => {
    if (format === "currency") return `$${v.toLocaleString()}`;
    if (format === "percent") return `${v.toFixed(1)}%`;
    return v.toLocaleString();
  };

  const tooltipStyle = {
    contentStyle: {
      background: "var(--surface, #0A0A0A)",
      border: "1px solid var(--borderline, #27272A)",
      borderRadius: "4px",
      color: "var(--text-main, #fff)",
      fontSize: "0.8125rem",
      fontFamily: "var(--font-mono), monospace",
    },
    labelStyle: {
      color: "var(--text-sec, #A1A1AA)",
      marginBottom: "4px",
    },
  };

  if (type === "bar") {
    return (
      <div className="mt-4">
        {title && (
          <h4
            className="text-sm font-medium mb-3"
            style={{ color: "var(--text-main)" }}
          >
            {title}
          </h4>
        )}
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data as Record<string, unknown>[]}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey={x_key}
              tick={{ fill: "var(--text-sec)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-sec)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
              tickFormatter={(v) => formatValue(v)}
            />
            <Tooltip
              formatter={(v) => [formatValue(Number(v)), y_key]}
              {...tooltipStyle}
            />
            <Bar dataKey={y_key || "value"} fill="#6366f1" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "line") {
    return (
      <div className="mt-4">
        {title && (
          <h4
            className="text-sm font-medium mb-3"
            style={{ color: "var(--text-main)" }}
          >
            {title}
          </h4>
        )}
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data as Record<string, unknown>[]}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey={x_key}
              tick={{ fill: "var(--text-sec)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-sec)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
              tickFormatter={(v) => formatValue(v)}
            />
            <Tooltip
              formatter={(v) => [formatValue(Number(v)), y_key]}
              {...tooltipStyle}
            />
            <Line
              type="monotone"
              dataKey={y_key || "value"}
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: "#6366f1", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "pie") {
    return (
      <div className="mt-4">
        {title && (
          <h4
            className="text-sm font-medium mb-3"
            style={{ color: "var(--text-main)" }}
          >
            {title}
          </h4>
        )}
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data as Record<string, unknown>[]}
              dataKey={y_key || "value"}
              nameKey={x_key || "name"}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ cx: pcx, x, y, name, value }: { cx: number; x: number; y: number; name: string; value: number }) => (
                <text x={x} y={y} fill="#fff" textAnchor={x > pcx ? "start" : "end"} dominantBaseline="central" fontSize={10} fontFamily="var(--font-mono)">{`${name}: ${formatValue(value)}`}</text>
              )}
            >
              {(data as Record<string, unknown>[]).map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [formatValue(Number(v))]}
              {...tooltipStyle}
            />
            <Legend
              wrapperStyle={{
                color: "var(--text-sec)",
                fontSize: "0.75rem",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "table") {
    const rows = data as Record<string, unknown>[];
    if (rows.length === 0) return null;
    const columns = Object.keys(rows[0]);

    return (
      <div className="mt-4 overflow-x-auto">
        {title && (
          <h4
            className="text-sm font-medium mb-3"
            style={{ color: "var(--text-main)" }}
          >
            {title}
          </h4>
        )}
        <table className="data-table w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col.replace(/_/g, " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="table-row-hover">
                {columns.map((col) => (
                  <td
                    key={col}
                    style={{
                      fontFamily:
                        typeof row[col] === "number"
                          ? "var(--font-mono), monospace"
                          : "inherit",
                    }}
                  >
                    {typeof row[col] === "number"
                      ? formatValue(row[col] as number)
                      : String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "number") {
    const value =
      data.length > 0
        ? ((data[0] as Record<string, unknown>)[y_key || "value"] as number)
        : 0;

    return (
      <div className="mt-4 text-center py-8">
        {title && (
          <p className="mono-label mb-3">{title}</p>
        )}
        <span
          className="text-4xl font-semibold tracking-tighter"
          style={{
            color: "var(--text-main)",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          {formatValue(value)}
        </span>
      </div>
    );
  }

  if (type === "gauge") {
    const value =
      data.length > 0
        ? ((data[0] as Record<string, unknown>)[y_key || "value"] as number)
        : 0;
    const pct = Math.min(Math.max(value, 0), 100);
    const color =
      pct >= 90
        ? "var(--accent-red)"
        : pct >= 70
          ? "var(--accent-amber)"
          : "var(--accent-green)";

    return (
      <div className="mt-4">
        {title && (
          <h4
            className="text-sm font-medium mb-3"
            style={{ color: "var(--text-main)" }}
          >
            {title}
          </h4>
        )}
        <div className="progress-bar" style={{ height: 6 }}>
          <div
            className="progress-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <p
          className="mono-label mt-2 text-center"
          style={{ color }}
        >
          {formatValue(value)}
        </p>
      </div>
    );
  }

  return null;
}
