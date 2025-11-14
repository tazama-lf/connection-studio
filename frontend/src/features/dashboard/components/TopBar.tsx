import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import UserCard from './UserCard';
import { useNavigate, useLocation } from 'react-router-dom';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';

interface TopBarProps {
  open: boolean;
  onToggle: () => void;
}

export default function TopBar({ open, onToggle }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const crumbs = pathSegments.map((seg, idx) => ({
    label: seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    path: '/' + pathSegments.slice(0, idx + 1).join('/'),
  }));

  return (
    <Toolbar sx={{ backgroundColor: '#fbf9fa', minHeight: 56, px: { xs: 1, sm: 2 }, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ width: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IconButton
          color="default"
          aria-label="toggle drawer"
          onClick={onToggle}
          edge="start"
          sx={{ width: 44, height: 44 }}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </IconButton>
      </Box>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => { window.location.href = '/dashboard'; }}>
          <img src="/logo.png" alt="Tazama Logo" style={{ height: 28, width: 'auto' }} />
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, color: '#000' }}>
            Tazama Connection Studio
          </Typography>
        </div>

        <Breadcrumbs aria-label="breadcrumb" sx={{ ml: 1, fontSize: '0.75rem' }} separator="/">
          <Link underline="none" color="inherit" sx={{ fontSize: '0.75rem' }} onClick={() => navigate('/dashboard')}>Dashboard</Link>
          {crumbs.map((c, i) => (
            i === crumbs.length - 1 ? (
              <Typography color="text.primary" key={c.path} sx={{ fontSize: '0.75rem' }}>{c.label}</Typography>
            ) : (
              <Link key={c.path} underline="none" color="inherit" onClick={() => navigate(c.path)} sx={{ fontSize: '0.75rem' }}>{c.label}</Link>
            )
          ))}
        </Breadcrumbs>
      </div>

      <Box sx={{ flexGrow: 1 }} />
      <UserCard />
    </Toolbar>
  );
}
