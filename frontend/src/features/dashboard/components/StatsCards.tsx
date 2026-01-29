import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import { ActivityIcon, DatabaseIcon, ClockIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes.config';

const AnimatedNumber: React.FC<{ end: number; duration?: number }> = ({ end, duration = 1 }) => {
  const [value, setValue] = React.useState(0);
  const ref = React.useRef<number | null>(null);

  React.useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = end;

    const step = (now: number) => {
      const elapsed = Math.min((now - start) / 1000, duration);
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.round(from + (to - from) * progress);
      setValue(current);
      if (progress < 1) {
        ref.current = requestAnimationFrame(step);
      }
    };

    ref.current = requestAnimationFrame(step);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [end, duration]);

  return <>{value.toLocaleString()}</>;
};


interface StatCard {
  id: string;
  title: string;
  value: number | string;
  subtitle?: string;
  color: string;
  icon: React.ReactElement;
  path?: string;
  percent?: number;
}

const StatItem: React.FC<{ item: StatCard }> = ({ item }) => (
  <Paper
    elevation={3}
    sx={{
      p: 3,
      borderRadius: 3,
      minWidth: { xs: '100%', sm: 300 },
      transition: 'transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease',
      '&:hover': {
        transform: 'translateY(-6px)',
        boxShadow: '0 18px 40px rgba(14,22,36,0.08)',
        backgroundColor: `${item.color}10`,
      }
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {item.title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.75 }}>
          {typeof item.value === 'number' ? (
            <AnimatedNumber end={item.value} duration={1} />
          ) : (
            item.value
          )}
        </Typography>
        {item.subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {item.subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `linear-gradient(135deg, ${item.color}22, ${item.color}11)`,
          border: `1px solid ${item.color}33`
        }}>
          <Avatar sx={{ bgcolor: 'transparent', width: 34, height: 34, boxShadow: 'none' }}>
            {React.isValidElement(item.icon) ? React.cloneElement(item.icon as any, { color: item.color, size: 18 }) : item.icon}
          </Avatar>
        </Box>
      </Box>
    </Box>

    <Box sx={{ height: 8, bgcolor: '#f0f3f5', borderRadius: 99, mt: 3, overflow: 'hidden' }}>
      <Box sx={{ width: '80%', height: '100%', bgcolor: item.color, borderRadius: 99 }} />
    </Box>
  </Paper>
);

const StatsCards: React.FC = () => {
  const navigate = useNavigate();

  const items: StatCard[] = [
    { id: 'dems', title: 'Dynamic Event Monitoring', value: 46, subtitle: 'All endpoints in system', color: '#3b82f6', icon: <ActivityIcon size={18} />, path: ROUTES.DEMS, percent: 46 },
    { id: 'de', title: 'Data Enrichment Jobs', value: 9, subtitle: 'Pull and Push Jobs', color: '#10b981', icon: <DatabaseIcon size={18} />, path: ROUTES.DATA_ENRICHMENT, percent: 9 },
    { id: 'cron', title: 'Cron Jobs Management', value: 40, subtitle: 'Schedules', color: '#f59e0b', icon: <ClockIcon size={18} />, path: ROUTES.CRON, percent: 40 },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, sm: 3, md: 4 },
          justifyContent: 'center',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 300px))',
            md: 'repeat(3, minmax(0, 300px))'
          },
          '@keyframes fadeUp': {
            '0%': { transform: 'translateY(8px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 }
          }
        }}
      >
        {items.map((it, idx) => (
          <Box
            key={it.id}
            sx={{
              animation: `fadeUp 420ms ease forwards`,
              animationDelay: `${idx * 120}ms`,
              opacity: 0,
              cursor: it.path ? 'pointer' : 'default'
            }}
            role={it.path ? 'button' : undefined}
            tabIndex={it.path ? 0 : undefined}
            onClick={() => it.path && navigate(it.path)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (it.path && (e.key === 'Enter' || e.key === ' ')) {
                navigate(it.path);
              }
            }}
          >
            <StatItem item={it} />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default StatsCards;
