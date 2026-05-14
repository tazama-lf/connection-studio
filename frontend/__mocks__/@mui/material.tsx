import React from 'react';

const mockTheme = {
  zIndex: { drawer: 1200, modal: 1300, snackbar: 1400, tooltip: 1500 },
};
function invokeSx(sx: any) {
  if (typeof sx === 'function') sx(mockTheme);
  else if (sx && typeof sx === 'object') {
    Object.values(sx).forEach((v) => {
      if (typeof v === 'function') v(mockTheme);
    });
  }
}
export const Backdrop = ({ children, open, onClick, sx, ...props }: any) => {
  invokeSx(sx);
  return (
    <div data-testid="mui-backdrop" onClick={onClick} {...props}>
      {open ? children : null}
    </div>
  );
};

export const Button = ({
  children,
  onClick,
  disabled,
  variant,
  ...props
}: any) => (
  <button onClick={onClick} disabled={disabled} {...props}>
    {children}
  </button>
);

export const CircularProgress = ({ size, ...props }: any) => (
  <div data-testid="circular-progress" {...props} />
);

export const TextField = ({ label, value, onChange, ...props }: any) => (
  <input aria-label={label} value={value} onChange={onChange} {...props} />
);

export const Select = ({ children, value, onChange, ...props }: any) => (
  <select value={value} onChange={onChange} {...props}>
    {children}
  </select>
);

export const MenuItem = ({ children, value, ...props }: any) => (
  <option value={value} {...props}>
    {children}
  </option>
);

export const Typography = ({ children, variant, ...props }: any) => (
  <span {...props}>{children}</span>
);

export const Box = ({ children, sx, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const Stack = ({ children, direction, spacing, sx, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const Paper = ({ children, elevation, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const IconButton = ({ children, onClick, disabled, ...props }: any) => (
  <button onClick={onClick} disabled={disabled} {...props}>
    {children}
  </button>
);

export const Tooltip = ({ children, title, ...props }: any) => <>{children}</>;

export const Dialog = ({ children, open, onClose, ...props }: any) =>
  open ? (
    <div data-testid="mui-dialog" role="dialog" {...props}>
      {children}
    </div>
  ) : null;

export const DialogTitle = ({ children, ...props }: any) => (
  <div data-testid="dialog-title" {...props}>
    {children}
  </div>
);

export const DialogContent = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const DialogActions = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const DialogContentText = ({ children, ...props }: any) => (
  <p {...props}>{children}</p>
);

export const Divider = ({ ...props }: any) => <hr {...props} />;

export const Chip = ({ label, onDelete, ...props }: any) => (
  <span data-testid="chip" {...props}>
    {label}
  </span>
);

export const FormControl = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const InputLabel = ({ children, ...props }: any) => (
  <label {...props}>{children}</label>
);

export const FormHelperText = ({ children, ...props }: any) => (
  <span {...props}>{children}</span>
);

export const Alert = React.forwardRef(
  ({ children, severity, ...props }: any, ref: any) => (
    <div ref={ref} role="alert" data-severity={severity} {...props}>
      {children}
    </div>
  ),
);

export const Snackbar = ({ children, open, ...props }: any) =>
  open ? <div {...props}>{children}</div> : null;

export const Switch = ({ checked, onChange, ...props }: any) => (
  <input type="checkbox" checked={checked} onChange={onChange} {...props} />
);

export const Radio = ({ checked, onChange, value, ...props }: any) => (
  <input
    type="radio"
    checked={checked}
    onChange={onChange}
    value={value}
    {...props}
  />
);

export const RadioGroup = ({ children, value, onChange, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const FormControlLabel = ({ label, control, ...props }: any) => (
  <label {...props}>
    {control}
    {label}
  </label>
);

export const Checkbox = ({ checked, onChange, ...props }: any) => (
  <input type="checkbox" checked={checked} onChange={onChange} {...props} />
);

export const LinearProgress = ({ value, variant, ...props }: any) => (
  <div role="progressbar" aria-valuenow={value} {...props} />
);

export const Autocomplete = ({
  options,
  renderInput,
  onChange,
  value,
  ...props
}: any) => (
  <div {...props}>{renderInput ? renderInput({ inputProps: {} }) : null}</div>
);

export const Grid = ({
  children,
  container,
  item,
  xs,
  sm,
  md,
  lg,
  spacing,
  sx,
  ...props
}: any) => <div {...props}>{children}</div>;

export const ListItem = ({ children, ...props }: any) => (
  <li {...props}>{children}</li>
);

export const List = ({ children, ...props }: any) => (
  <ul {...props}>{children}</ul>
);

export const ListItemText = ({ primary, secondary, ...props }: any) => (
  <div {...props}>
    <span>{primary}</span>
    {secondary && <span>{secondary}</span>}
  </div>
);

export const ListItemButton = ({
  children,
  onClick,
  selected,
  ...props
}: any) => (
  <div role="button" onClick={onClick} data-selected={selected} {...props}>
    {children}
  </div>
);

export const Collapse = ({ children, in: inProp, ...props }: any) =>
  inProp ? <div {...props}>{children}</div> : null;

export const Menu = ({ children, anchorEl, open, onClose, ...props }: any) =>
  open ? (
    <div role="menu" {...props}>
      {children}
    </div>
  ) : null;

export const Popover = ({
  children,
  anchorEl,
  open,
  onClose,
  ...props
}: any) => (open ? <div {...props}>{children}</div> : null);

export const Tabs = ({ children, value, onChange, ...props }: any) => (
  <div role="tablist" {...props}>
    {children}
  </div>
);

export const Tab = ({ label, value, ...props }: any) => (
  <button role="tab" {...props}>
    {label}
  </button>
);

export const Table = ({ children, ...props }: any) => (
  <table {...props}>{children}</table>
);

export const TableBody = ({ children, ...props }: any) => (
  <tbody {...props}>{children}</tbody>
);

export const TableCell = ({ children, ...props }: any) => (
  <td {...props}>{children}</td>
);

export const TableContainer = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const TableHead = ({ children, ...props }: any) => (
  <thead {...props}>{children}</thead>
);

export const TableRow = ({ children, ...props }: any) => (
  <tr {...props}>{children}</tr>
);

export const Container = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const Avatar = ({ src, alt, children, ...props }: any) => (
  <div role="img" aria-label={alt} {...props}>
    {children || alt?.[0]}
  </div>
);

export const Badge = ({ children, badgeContent, ...props }: any) => (
  <span {...props}>
    {children}
    {badgeContent}
  </span>
);

export const InputAdornment = ({ children, position, ...props }: any) => (
  <span {...props}>{children}</span>
);

export const OutlinedInput = ({ value, onChange, ...props }: any) => (
  <input value={value} onChange={onChange} {...props} />
);

export const useTheme = () => ({
  palette: {
    primary: { main: '#1976d2', light: '#42a5f5', dark: '#1565c0' },
    secondary: { main: '#9c27b0', light: '#ba68c8', dark: '#7b1fa2' },
    error: { main: '#d32f2f' },
    warning: { main: '#ed6c02' },
    info: { main: '#0288d1' },
    success: { main: '#2e7d32' },
    background: { default: '#fff', paper: '#fff' },
    text: { primary: '#000', secondary: '#666' },
    grey: { 100: '#f5f5f5', 200: '#eeeeee', 300: '#e0e0e0' },
    mode: 'light',
  },
  spacing: (n: number) => `${n * 8}px`,
  breakpoints: {
    up: () => '@media (min-width: 0px)',
    down: () => '@media (max-width: 9999px)',
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  zIndex: { modal: 1300, tooltip: 1500 },
  typography: {
    h1: {},
    h2: {},
    h3: {},
    h4: {},
    h5: {},
    h6: {},
    body1: {},
    body2: {},
    subtitle1: {},
    subtitle2: {},
    caption: {},
    button: {},
  },
  shape: { borderRadius: 4 },
  mixins: { toolbar: { minHeight: 56 } },
  shadows: Array(25).fill('none'),
  transitions: {
    create: () => 'all 300ms ease',
    easing: { easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    duration: { shortest: 150, shorter: 200, short: 250, standard: 300 },
  },
  components: {},
});

const DefaultMuiComponent = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export default {
  Backdrop,
  Button,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  Typography,
  Box,
  Stack,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  FormHelperText,
  Alert,
  Snackbar,
  Switch,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Autocomplete,
  Grid,
  ListItem,
  List,
  ListItemText,
  ListItemButton,
  Collapse,
  Menu,
  Popover,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Container,
  Avatar,
  Badge,
  InputAdornment,
  OutlinedInput,
  useTheme,
  ThemeProvider,
  createTheme,
  CssBaseline,
  GlobalStyles,
};

export const ThemeProvider = ({ children }: any) => <>{children}</>;
export const createTheme = (options?: any) => options || {};
export const CssBaseline = () => null;
export const GlobalStyles = () => null;
export const SvgIcon = ({ children, ...props }: any) => (
  <svg {...props}>{children}</svg>
);
export const Skeleton = ({ variant, width, height, ...props }: any) => (
  <div {...props} />
);
export const Stepper = ({ children, activeStep, ...props }: any) => {
  const childArray = React.Children.toArray(children);
  return (
    <div {...props}>
      {childArray.map((child: any, index: number) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<any>, {
              _index: index,
              _activeStep: activeStep,
            })
          : child,
      )}
    </div>
  );
};
export const Step = ({ children, _index, _activeStep, ...props }: any) => {
  const active = _index === _activeStep;
  const completed = typeof _activeStep === 'number' && _index < _activeStep;
  return (
    <div {...props}>
      {React.Children.map(children, (child: any) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<any>, {
              active,
              completed,
              icon: (_index ?? 0) + 1,
            })
          : child,
      )}
    </div>
  );
};
export const StepLabel = ({ children, StepIconComponent, icon, active, completed, ...props }: any) => (
  <div {...props}>
    {StepIconComponent && <StepIconComponent active={active || false} completed={completed || false} icon={icon} />}
    {children}
  </div>
);
export const StepContent = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const Popper = ({ children, open, ...props }: any) =>
  open ? <div {...props}>{children}</div> : null;
export const ClickAwayListener = ({ children, onClickAway, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const Grow = ({ children, in: inProp, ...props }: any) => (
  <>{children}</>
);
export const Fade = ({ children, in: inProp, ...props }: any) => (
  <>{children}</>
);
export const Zoom = ({ children, in: inProp, ...props }: any) => (
  <>{children}</>
);
export const Slide = ({ children, in: inProp, ...props }: any) => (
  <>{children}</>
);
export const Modal = ({ children, open, onClose, ...props }: any) =>
  open ? (
    <div role="dialog" {...props}>
      {children}
    </div>
  ) : null;
export const Drawer = ({ children, open, onClose, anchor, ...props }: any) =>
  open ? <div {...props}>{children}</div> : null;
export const AppBar = ({ children, position, ...props }: any) => (
  <header {...props}>{children}</header>
);
export const Toolbar = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const Card = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const CardContent = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const CardActions = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const CardHeader = ({ title, subheader, action, ...props }: any) => (
  <div {...props}>
    <div>{title}</div>
    <div>{subheader}</div>
    <div>{action}</div>
  </div>
);
export const CardMedia = ({ image, alt, ...props }: any) => (
  <img src={image} alt={alt} {...props} />
);
export const Accordion = ({ children, expanded, onChange, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const AccordionSummary = ({ children, expandIcon, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const AccordionDetails = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const ToggleButton = ({
  children,
  value,
  selected,
  onChange,
  ...props
}: any) => <button {...props}>{children}</button>;
export const ToggleButtonGroup = ({
  children,
  value,
  exclusive,
  onChange,
  ...props
}: any) => <div {...props}>{children}</div>;
export const Rating = ({ value, onChange, ...props }: any) => (
  <div {...props} />
);
export const Slider = ({ value, onChange, min, max, step, ...props }: any) => (
  <input
    type="range"
    value={value}
    onChange={onChange}
    min={min}
    max={max}
    step={step}
    {...props}
  />
);
export const SpeedDial = ({ children, ariaLabel, ...props }: any) => (
  <div aria-label={ariaLabel} {...props}>
    {children}
  </div>
);
export const SpeedDialAction = ({
  tooltipTitle,
  icon,
  onClick,
  ...props
}: any) => (
  <button onClick={onClick} aria-label={tooltipTitle} {...props}>
    {icon}
  </button>
);
export const SpeedDialIcon = ({ icon, openIcon, ...props }: any) => (
  <span {...props}>{icon}</span>
);
export const Fab = ({ children, onClick, ...props }: any) => (
  <button onClick={onClick} {...props}>
    {children}
  </button>
);
export const ButtonGroup = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);
export const Breadcrumbs = ({ children, ...props }: any) => (
  <nav aria-label="breadcrumb" {...props}>
    <ol>{children}</ol>
  </nav>
);
export const Link = ({ children, href, ...props }: any) => (
  <a href={href} {...props}>
    {children}
  </a>
);
export const ImageList = ({ children, ...props }: any) => (
  <ul {...props}>{children}</ul>
);
export const ImageListItem = ({ children, ...props }: any) => (
  <li {...props}>{children}</li>
);
export const Pagination = ({ count, page, onChange, ...props }: any) => (
  <nav {...props} />
);
export const TablePagination = ({
  count,
  page,
  rowsPerPage,
  onPageChange,
  ...props
}: any) => <div {...props} />;

// Styled system
export const styled = (Component: any) => (styles?: any) => Component;
export const createStyles = (styles: any) => styles;
export const alpha = (color: string, opacity: number) => color;
export const darken = (color: string, coefficient: number) => color;
export const lighten = (color: string, coefficient: number) => color;

export const inputClasses = {
  root: 'root',
  input: 'input',
  focused: 'focused',
  disabled: 'disabled',
  error: 'error',
};
export const buttonClasses = {
  root: 'root',
  disabled: 'disabled',
  contained: 'contained',
  outlined: 'outlined',
  text: 'text',
};
export const chipClasses = {
  root: 'root',
  label: 'label',
  deleteIcon: 'deleteIcon',
};

export default DefaultMuiComponent;
