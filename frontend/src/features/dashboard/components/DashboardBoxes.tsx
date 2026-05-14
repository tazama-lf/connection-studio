import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {
  ActivityIcon,
  DatabaseIcon,
  ClockIcon,
  PackageIcon,
} from 'lucide-react';
import { alpha } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import { ROUTES } from '../../../shared/config/routes.config';

export const BoxCard: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ReactElement;
  color?: string;
  onClick?: () => void;
  selected?: boolean;
}> = ({
  title,
  subtitle,
  icon,
  color = '#7c3aed',
  onClick,
  selected = false,
}) => {
  const iconBg = alpha(color, 0.06);
  const iconBorder = alpha(color, 0.18);
  const hoverIconBg = alpha(color, 0.12);
  const hoverIconBorder = alpha(color, 0.36);
  const cardHoverBg = alpha(color, 0.03);

  return (
    <Paper
      elevation={1}
      sx={{
        p: 4,
        pt: 5,
        pb: 4,
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        textAlign: 'center',
        position: 'relative',
        backgroundColor: (theme: any) => theme.palette.background.paper,
        border: '1px solid rgba(0,0,0,0.06)',
        transition:
          'transform 200ms cubic-bezier(.2,.8,.2,1), box-shadow 200ms ease, background-color 200ms ease',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 18px 40px rgba(14,22,36,0.08)',
          cursor: onClick ? 'pointer' : 'default',
          backgroundColor: cardHoverBg,
        },
        '&:hover .box-icon': {
          transform: 'translateY(-4px) scale(1.04)',
          backgroundColor: hoverIconBg,
          borderColor: hoverIconBorder,
          boxShadow: '0 14px 30px rgba(14,22,36,0.06)',
        },
      }}
      onClick={onClick}
    >
      {selected && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: alpha(color, 0.12),
            border: `2px solid ${alpha(color, 0.28)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{ width: 10, height: 10, bgcolor: color, borderRadius: '50%' }}
          />
        </Box>
      )}

      <Box
        className="box-icon"
        sx={{
          width: 84,
          height: 84,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: iconBg,
          border: `1px solid ${iconBorder}`,
          transition:
            'transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease, border-color 200ms ease',
          boxShadow: '0 10px 30px rgba(14,22,36,0.04)',
        }}
      >
        {React.isValidElement(icon)
          ? React.cloneElement(icon as any, { size: 34, color })
          : icon}
      </Box>

      <Box sx={{ mt: 1.5 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, letterSpacing: '-0.01em', mb: 0.5 }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 320 }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Paper>
  );
};

const DashboardBoxes: React.FC = () => {
  const navigate = useNavigate();

  const { user } = useAuth();

  const claims: string[] = user?.claims ?? [];
  const claimsLower = claims.map((c) => (c ?? '').toString().toLowerCase());
  const hasClaim = (role: string) =>
    claimsLower.some((c) => c === role || c.includes(role));
  const isApprover = hasClaim('approver');
  const isPublisher = hasClaim('publisher');
  const isExporter = hasClaim('exporter');

  const approverPaths: Record<string, string> = {
    dems: '/approver/configs',
    de: '/approver/jobs',
    cron: '/approver/cron-jobs',
  };

  const publisherPaths: Record<string, string> = {
    dems: '/publisher/configs',
    de: '/publisher/de-jobs',
    cron: '/publisher/cron-jobs',
    exported: '/publisher/exported-items',
  };

  const exporterPaths: Record<string, string> = {
    dems: '/exporter/configs',
    de: '/exporter/jobs',
    cron: '/exporter/cron-jobs',
  };

  const defaultPaths: Record<string, string> = {
    dems: ROUTES.DEMS,
    de: ROUTES.DATA_ENRICHMENT,
    cron: ROUTES.CRON,
  };

  const resolvePath = (id: string) => {
    if (isApprover) return approverPaths[id] || defaultPaths[id];
    if (isPublisher) return publisherPaths[id];
    if (isExporter) return exporterPaths[id];
    return defaultPaths[id];
  };

  const baseItems = [
    {
      id: 'dems',
      title: 'Dynamic Event Monitoring',
      subtitle:
        'Review and approve configuration changes for data endpoints and mappings.',
      icon: <ActivityIcon />,
      color: '#3b82f6',
    },
    {
      id: 'de',
      title: 'Data Enrichment',
      subtitle:
        'Approve or reject data enrichment job requests and monitor their status.',
      icon: <DatabaseIcon />,
      color: '#10b981',
    },
    {
      id: 'cron',
      title: 'Cron Job Management',
      subtitle:
        'Review and approve scheduled cron job configurations and executions.',
      icon: <ClockIcon />,
      color: '#f59e0b',
    },
  ];

  const items = baseItems.map((it) => ({ ...it, path: resolvePath(it.id) }));

  if (isPublisher) {
    items.push({
      id: 'exported',
      title: 'Exported Items',
      subtitle:
        'Review exported items ready for publishing (Cron Jobs, DE Jobs, DEMS)',
      icon: <PackageIcon />,
      color: '#7c3aed',
      path: resolvePath('exported'),
    });
  }

  const [mounted, setMounted] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 40);
    return () => {
      clearTimeout(t);
    };
  }, []);

  return (
    <Box
      sx={(theme: any) => ({
        px: '48px',
        mb: 2,
        backgroundColor: theme.palette.background.default,
        borderRadius: 2,
        py: 2,
        pt: '56px !important',
      })}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: '1fr 1fr',
            lg: 'repeat(3, 1fr)',
          },
          gap: 3,
        }}
      >
        {items.map((it, idx) => (
          <Box
            key={it.id}
            sx={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(12px)',
              transition: `opacity 420ms ease ${idx * 90 + 80}ms, transform 420ms cubic-bezier(.2,.8,.2,1) ${idx * 90 + 80}ms`,
            }}
          >
            <BoxCard
              title={it.title}
              subtitle={it.subtitle}
              icon={it.icon}
              color={it.color}
              onClick={async () => {
                await navigate(it.path);
              }}
              selected={
                location.pathname === it.path ||
                location.pathname.startsWith(it.path)
              }
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default DashboardBoxes;
