import ListItemButton from '@mui/material/ListItemButton';
import { styled } from '@mui/material/styles';

const NavListItemButton = styled(ListItemButton, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ open }: { open?: boolean }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: open ? 'initial' : 'center',
    minHeight: 48,
    px: 2.5,
  }) as any,
);

export default NavListItemButton;
