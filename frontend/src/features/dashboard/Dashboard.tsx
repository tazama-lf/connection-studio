import * as React from 'react';
import { styled } from '@mui/material/styles';
import MuiAppBar from '@mui/material/AppBar';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { Outlet , useLocation } from 'react-router-dom';

import TopBar from './components/TopBar';
import SideNav from './components/SideNav';
import Drawer from './components/Drawer';
import DashboardBoxes from './components/DashboardBoxes';
import { useAuth } from '../auth/contexts/AuthContext';
import { ROUTES } from '../../shared/config/routes.config';
const drawerWidth = 240;
const HEADER_HEIGHT = 40;
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  minHeight: HEADER_HEIGHT,
  backgroundColor: '#FBF9FA',
  borderBottom: '1px solid rgba(0,0,0,0.04)',
}));
const AppBar = styled(MuiAppBar)(() => ({
  zIndex: 50, // Fixed z-index for header
  backgroundColor: '#FBF9FA',
  color: '#000',
  boxShadow: 'none',
  '&.MuiPaper-elevation4': {
    boxShadow: 'none',
  },
}));
export default function Dashboard() {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const handleToggleMenu = () => {
    setOpen((s) => !s);
  };
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed">
        <TopBar open={open} onToggle={handleToggleMenu} />
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <SideNav open={open} onClose={() => { setOpen(false); }} />
      </Drawer>
      <Box
        component="main"
        sx={(theme: any) => ({
          flexGrow: 1,
          p: 3,
          transition: 'margin-left 225ms cubic-bezier(0.4,0,0.2,1)',
          ml: open ? `${drawerWidth}px` : `calc(${theme.spacing(7)} + 1px)`,
          [theme.breakpoints.up('sm')]: {
            ml: open ? `${drawerWidth}px` : `calc(${theme.spacing(8)} + 1px)`,
          },
        })}
      >
        <DrawerHeader />
        <div>
          {(() => {
            const rolesToShow = ['editor', 'approver', 'exporter', 'publisher'];
            const hasRole = user?.claims?.some((c: string) =>
              rolesToShow.includes(c),
            );
            return location.pathname === ROUTES.DASHBOARD && hasRole ? (
              <DashboardBoxes />
            ) : null;
          })()}
          <Outlet />
        </div>
      </Box>
    </Box>
  );
}
