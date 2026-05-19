import { styled } from '@mui/material/styles';
import {
  Dialog,
  Box,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';

const SPACING_SM = 2;
const SPACING_MD = 2.5;

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

export const DateCell = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  width: '100%',
}));

export const DateIcon = styled('svg')(() => ({
  width: 16,
  height: 16,
  marginRight: 4,
  color: '#9ca3af',
}));

export const TypeCell = styled(Box)<{ pull: boolean }>(({ pull }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  color: pull ? '#2563eb' : '#7c3aed',
}));

export const ActionsWrapper = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: '100%',
}));

export const ActionIcon = styled(Box)<{ color: string }>(({ color }) => ({
  display: 'flex',
  cursor: 'pointer',
  color,
}));

export const DialogBodyText = styled(DialogContentText)(() => ({
  fontSize: 16,
  lineHeight: 1.6,
  color: '#374151',
  marginBottom: 16,
}));

export const Highlight = styled(Box)<{
  fg: string;
  bg: string;
}>(({ fg, bg }) => ({
  fontWeight: 'bold',
  color: fg,
  backgroundColor: bg,
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 15,
  display: 'inline-block',
}));

export const DialogFooter = styled(DialogActions)(() => ({
  padding: '12px 20px 16px',
}));

export const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: 6,
    minWidth: 400,
    boxShadow: 'none',
  },
}));

export const DialogHeader = styled(Box)(({ theme }) => ({
  color: '#3B3B3B',
  fontSize: 20,
  fontWeight: 700,
  padding: theme.spacing(SPACING_SM, SPACING_MD),
  borderBottom: '1px solid #CECECE',
}));

export const DialogBody = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(SPACING_MD),
}));

export const DescriptionText = styled(DialogContentText)({
  fontSize: 16,
  lineHeight: 1.6,
  color: '#374151',
  marginBottom: 16,
});

export const HighlightText = styled(Box)<{ color?: string }>(({ color }) => ({
  display: 'inline-block',
  fontWeight: 700,
  color: color ?? '#33AD74',
  backgroundColor: '#F0FDF4',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 15,
}));

export const InfoBox = styled(Box)<{ bg?: string; border?: string }>(
  ({ bg, border }) => ({
    backgroundColor: bg ?? '#F0FDF4',
    border: `1px solid ${border ?? '#BBF7D0'}`,
    borderRadius: 8,
    padding: '12px 16px',
    marginTop: 16,
  }),
);

export const InfoText = styled(DialogContentText)<{ color?: string }>(
  ({ color }) => ({
    fontSize: 16,
    color: color ?? '#33AD74',
    margin: 0,
    fontWeight: 500,
  }),
);

export const PauseDialog = styled(Dialog)({
  '& .MuiPaper-root': {
    borderRadius: 6,
    minWidth: 400,
    boxShadow: 'none',
  },
});

export const PauseDialogHeader = styled(Box)({
  color: '#3B3B3B',
  fontSize: 20,
  fontWeight: 'bold',
  padding: '16px 20px',
  borderBottom: '1px solid #CECECE',
});

export const PauseDialogContent = styled(DialogContent)({
  padding: '20px 20px',
});

export const PauseDescription = styled(DialogContentText)({
  fontSize: 16,
  lineHeight: 1.6,
  color: '#374151',
  marginBottom: 16,
});

export const PauseHighlight = styled(Box)({
  display: 'inline-block',
  fontWeight: 'bold',
  color: '#FF9800',
  backgroundColor: '#FFF7ED',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 15,
});

export const PauseWarningBox = styled(Box)({
  backgroundColor: '#FFF7ED',
  border: '1px solid #FFE0B2',
  borderRadius: 8,
  padding: '12px 16px',
  marginTop: 16,
});

export const PauseWarningText = styled(DialogContentText)({
  fontSize: 16,
  color: '#FF9800',
  margin: 0,
  fontWeight: 500,
});

export const PauseDialogActions = styled(DialogActions)({
  padding: '12px 20px 16px 20px',
});

export const ConfirmDialog = styled(Dialog)({
  '& .MuiPaper-root': {
    borderRadius: 12,
    minWidth: 400,
    boxShadow: 'none',
  },
});

export const ConfirmContent = styled(DialogContent)({
  padding: '20px 20px',
});

export const ConfirmText = styled(DialogContentText)({
  fontSize: 16,
  lineHeight: 1.6,
  color: '#374151',
  marginBottom: 16,
});

export const ConfirmActions = styled(DialogActions)({
  padding: '12px 20px 16px 20px',
});
