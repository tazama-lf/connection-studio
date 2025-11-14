import { styled } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { CSSObject } from '@mui/system';
import MuiDrawer from '@mui/material/Drawer';

const drawerWidth = 240;
const HEADER_HEIGHT = 40;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  top: HEADER_HEIGHT,
  height: `calc(100% - ${HEADER_HEIGHT}px)`,
  position: 'fixed',
  backgroundColor: '#fbf9fa',
});



const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
  top: HEADER_HEIGHT,
  height: `calc(100% - ${HEADER_HEIGHT}px)`,
  position: 'fixed',
  backgroundColor: '#fbf9fa',
});

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open
      ? {
          ...openedMixin(theme as Theme),
          '& .MuiDrawer-paper': openedMixin(theme as Theme),
        }
      : {
          ...closedMixin(theme as Theme),
          '& .MuiDrawer-paper': closedMixin(theme as Theme),
        }),
  })
);

export default Drawer;
