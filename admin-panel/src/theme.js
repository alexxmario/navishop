import { createTheme } from '@mui/material/styles';

// Vocabularul vizual împrumutat din panoul enavigatii, păstrând culorile
// PilotOn: albastru ca accent, suprafețe plate cu borduri de 1px (fără
// umbre pe carduri), butoane pastilă și micro-etichete mono uppercase
// pe capetele de tabel, chip-uri și breadcrumb.
const ink = '#181d23';
const steel = '#5b6470';
const line = '#e4e7ec';
const lineSoft = '#eef0f3';
const mist = '#f2f4f6';
const paper = '#ffffff';

// Lateralul întunecat (nuanțat spre albastru, nu negru pur)
const night = '#0f1318';
const nightSoft = '#1a2029';
const nightLine = '#262d37';

const blue = '#1976d2';
const blueDark = '#1565c0';

const mono = '"IBM Plex Mono", ui-monospace, Menlo, Monaco, Consolas, monospace';

const microLabel = {
  fontFamily: mono,
  fontSize: '0.66rem',
  fontWeight: 500,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const pilotOnTheme = createTheme({
  // lățimile lateralului, citite de react-admin (theme.sidebar)
  sidebar: {
    width: 248,
    closedWidth: 64,
  },
  palette: {
    mode: 'light',
    primary: {
      main: blue,
      light: '#42a5f5',
      dark: blueDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: '#ffffff',
    },
    background: {
      default: mist,
      paper,
    },
    text: {
      primary: ink,
      secondary: steel,
    },
    divider: line,
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
      contrastText: '#ffffff',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
      contrastText: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    h1: { fontSize: '2.1rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.55rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.015em' },
    h4: { fontSize: '1.45rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.015em' },
    h5: { fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.35, letterSpacing: '-0.01em' },
    h6: { fontSize: '1.02rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body2: { fontSize: '0.875rem' },
    button: { textTransform: 'none', fontWeight: 600 },
    overline: { ...microLabel, lineHeight: 2 },
    caption: { fontSize: '0.78rem', color: steel },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${line}`,
          borderRadius: 16,
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          padding: '8px 18px',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        sizeSmall: {
          padding: '5px 13px',
          fontSize: '0.8rem',
        },
        contained: {
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          backgroundColor: blue,
          '&:hover': { backgroundColor: blueDark },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': { borderWidth: 1.5 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontFamily: mono,
          fontWeight: 500,
          fontSize: '0.68rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        },
        sizeSmall: {
          fontSize: '0.62rem',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: paper,
          backgroundImage: 'none',
          color: ink,
          boxShadow: 'none',
          borderBottom: `1px solid ${line}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: night,
          borderRight: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          ...microLabel,
          backgroundColor: paper,
          color: steel,
          borderBottom: `1px solid ${line}`,
          whiteSpace: 'nowrap',
          padding: '12px 14px',
        },
        body: {
          fontSize: '0.875rem',
          borderBottom: `1px solid ${lineSoft}`,
          padding: '11px 14px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: mist },
          '&:last-child .MuiTableCell-body': { borderBottom: 0 },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: paper,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: line },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: steel },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: blue,
            borderWidth: 1.5,
          },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 2, backgroundColor: blue },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          '&.Mui-selected': { color: ink },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: `1px solid ${line}`,
          boxShadow: '0 24px 64px rgba(15, 19, 24, 0.18)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: `1px solid ${line}`,
          boxShadow: '0 8px 24px rgba(15, 19, 24, 0.1)',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: `1px solid ${line}`,
          boxShadow: '0 8px 24px rgba(15, 19, 24, 0.1)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: night,
          borderRadius: 8,
          fontSize: '0.75rem',
          padding: '6px 10px',
        },
        arrow: { color: night },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.06)' },
          '&.Mui-selected': {
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.14)' },
          },
        },
      },
    },

    // ── Componente react-admin ─────────────────────────────
    RaMenuItemLink: {
      styleOverrides: {
        root: {
          color: '#c3cad2',
          borderRadius: 10,
          margin: '2px 10px',
          padding: '9px 12px',
          fontSize: '0.9rem',
          fontWeight: 500,
          '& .RaMenuItemLink-icon': {
            color: '#8b939c',
            minWidth: 34,
            '& svg': { fontSize: 19 },
          },
          '&:hover': {
            backgroundColor: nightSoft,
            color: paper,
            '& .RaMenuItemLink-icon': { color: '#c3cad2' },
          },
          '&.RaMenuItemLink-active': {
            backgroundColor: nightSoft,
            color: paper,
            fontWeight: 600,
            '& .RaMenuItemLink-icon': { color: '#64b5f6' },
          },
        },
      },
    },
    RaDatagrid: {
      styleOverrides: {
        root: {
          '& .RaDatagrid-headerCell': {
            ...microLabel,
            backgroundColor: paper,
            color: steel,
          },
        },
      },
    },
    RaList: {
      styleOverrides: {
        root: {
          '& .RaList-content': {
            border: `1px solid ${line}`,
            borderRadius: 16,
            boxShadow: 'none',
          },
        },
      },
    },
  },
});

// Tokens reutilizate de Layout / LoginPage (doar stil, nu logică)
export const adminTokens = {
  ink,
  steel,
  line,
  mist,
  paper,
  night,
  nightSoft,
  nightLine,
  blue,
  blueDark,
  mono,
};

export { pilotOnTheme };
export default pilotOnTheme;
