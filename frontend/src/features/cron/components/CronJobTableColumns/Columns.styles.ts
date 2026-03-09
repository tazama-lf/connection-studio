import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

export const HeaderWrapper = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '12px 0',
}));

export const HeaderTitle = styled(Box)(() => ({
  fontSize: 14,
  fontWeight: 600,
}));

export const CellText = styled(Box)(() => ({
  fontSize: 13,
}));

export const ActionsContainer = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: '100%',
}));

export const ActionIcon = styled('span')({
  display: 'flex',
  cursor: 'pointer',
});

export const ViewIconStyle = styled(ActionIcon)(() => ({
  color: '#1976d2',
}));

export const EditIconStyle = styled(ActionIcon)(() => ({
  color: '#ed6c02',
  '&:hover': {
    color: '#e65100',
  },
}));

export const ExportIconStyle = styled(ActionIcon)(() => ({
  color: '#0097a7',
  '&:hover': {
    color: '#00838f',
  },
}));

export const DateContainer = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  fontSize: 13,
}));

export const DateIcon = styled('svg')(() => ({
  width: 16,
  height: 16,
  marginRight: 4,
  color: '#9e9e9e',
}));
