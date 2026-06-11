import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';

export function Sparkline({ data }: { data: number[] }) {
  const chartData = useMemo(() => data.map((value, i) => ({ value, index: i })), [data]);
  const min = Math.min(...data);
  const max = Math.max(...data);

  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={[min, max]} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--chart-1))"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
