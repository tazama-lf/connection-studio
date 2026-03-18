import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ActionIcon,
  ActionsWrapper,
  CellText,
  ConfirmContent,
  ConfirmActions,
  ConfirmDialog,
  ConfirmText,
  DateCell,
  DateIcon,
  DescriptionText,
  DialogBody,
  DialogBodyText,
  DialogFooter,
  DialogHeader,
  HeaderWrapper,
  HeaderTitle,
  Highlight,
  HighlightText,
  InfoBox,
  InfoText,
  PauseDescription,
  PauseDialog,
  PauseDialogActions,
  PauseDialogContent,
  PauseDialogHeader,
  PauseHighlight,
  PauseWarningBox,
  PauseWarningText,
  StyledDialog,
  TypeCell,
} from '../../../../../src/features/data-enrichment/components/JobList/JobList.styles';

describe('features/data-enrichment/components/JobList/JobList.styles.ts', () => {
  it('exports styled components as renderable components', () => {
    expect(ActionIcon).toBeDefined();
    expect(ActionsWrapper).toBeDefined();
    expect(CellText).toBeDefined();
    expect(ConfirmContent).toBeDefined();
    expect(ConfirmActions).toBeDefined();
    expect(ConfirmDialog).toBeDefined();
    expect(ConfirmText).toBeDefined();
    expect(DateCell).toBeDefined();
    expect(DateIcon).toBeDefined();
    expect(DescriptionText).toBeDefined();
    expect(DialogBody).toBeDefined();
    expect(DialogBodyText).toBeDefined();
    expect(DialogFooter).toBeDefined();
    expect(DialogHeader).toBeDefined();
    expect(HeaderWrapper).toBeDefined();
    expect(HeaderTitle).toBeDefined();
    expect(Highlight).toBeDefined();
    expect(HighlightText).toBeDefined();
    expect(InfoBox).toBeDefined();
    expect(InfoText).toBeDefined();
    expect(PauseDescription).toBeDefined();
    expect(PauseDialog).toBeDefined();
    expect(PauseDialogActions).toBeDefined();
    expect(PauseDialogContent).toBeDefined();
    expect(PauseDialogHeader).toBeDefined();
    expect(PauseHighlight).toBeDefined();
    expect(PauseWarningBox).toBeDefined();
    expect(PauseWarningText).toBeDefined();
    expect(StyledDialog).toBeDefined();
    expect(TypeCell).toBeDefined();
  });

  it('renders all styled components and optional/default prop branches', () => {
    render(
      React.createElement(
        'div',
        null,
        React.createElement(HeaderWrapper, null, 'HeaderWrapper'),
        React.createElement(HeaderTitle, null, 'Header'),
        React.createElement(CellText, null, 'Cell'),
        React.createElement(DateCell, null, 'DateCell'),
        React.createElement(DateIcon, null),
        React.createElement(TypeCell, { pull: true }, 'Pull'),
        React.createElement(TypeCell, { pull: false }, 'Push'),
        React.createElement(ActionsWrapper, null, 'ActionsWrapper'),
        React.createElement(ActionIcon, { color: '#2563eb' }, 'Action'),
        React.createElement(DialogBodyText, null, 'DialogBodyText'),
        React.createElement(Highlight, { fg: '#2563eb', bg: '#eff6ff' }, 'Highlight'),
        React.createElement(HighlightText, null, 'HighlightTextDefaultColor'),
        React.createElement(HighlightText, { color: '#111111' }, 'HighlightTextCustomColor'),
        React.createElement(InfoBox, null, 'InfoBoxDefault'),
        React.createElement(InfoBox, { bg: '#111111', border: '#222222' }, 'InfoBoxCustom'),
        React.createElement(InfoText, { color: '#33AD74' }, 'Info'),
        React.createElement(InfoText, null, 'InfoDefaultColor'),
        React.createElement(StyledDialog, { open: true }, React.createElement('div', null, 'StyledDialog')),
        React.createElement(DialogHeader, null, 'DialogHeader'),
        React.createElement(DialogBody, null, 'DialogBody'),
        React.createElement(DescriptionText, null, 'DescriptionText'),
        React.createElement(DialogFooter, null, 'DialogFooter'),
        React.createElement(PauseDialog, { open: true }, React.createElement('div', null, 'PauseDialog')),
        React.createElement(PauseDialogHeader, null, 'PauseDialogHeader'),
        React.createElement(PauseDialogContent, null, 'PauseDialogContent'),
        React.createElement(PauseDescription, null, 'PauseDescription'),
        React.createElement(PauseHighlight, null, 'PauseHighlight'),
        React.createElement(PauseWarningBox, null, 'PauseWarningBox'),
        React.createElement(PauseWarningText, null, 'PauseWarningText'),
        React.createElement(PauseDialogActions, null, 'PauseDialogActions'),
        React.createElement(ConfirmDialog, { open: true }, React.createElement('div', null, 'ConfirmDialog')),
        React.createElement(ConfirmContent, null, 'ConfirmContent'),
        React.createElement(ConfirmText, null, 'ConfirmText'),
        React.createElement(ConfirmActions, null, 'ConfirmActions'),
      ),
    );

    expect(screen.getByText('HeaderWrapper')).toBeInTheDocument();
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Cell')).toBeInTheDocument();
    expect(screen.getByText('Pull')).toBeInTheDocument();
    expect(screen.getByText('Push')).toBeInTheDocument();
    expect(screen.getByText('ActionsWrapper')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('DialogBodyText')).toBeInTheDocument();
    expect(screen.getByText('Highlight')).toBeInTheDocument();
    expect(screen.getByText('HighlightTextDefaultColor')).toBeInTheDocument();
    expect(screen.getByText('HighlightTextCustomColor')).toBeInTheDocument();
    expect(screen.getByText('InfoBoxDefault')).toBeInTheDocument();
    expect(screen.getByText('InfoBoxCustom')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('InfoDefaultColor')).toBeInTheDocument();
    expect(screen.getByText('StyledDialog')).toBeInTheDocument();
    expect(screen.getByText('DialogHeader')).toBeInTheDocument();
    expect(screen.getByText('DialogBody')).toBeInTheDocument();
    expect(screen.getByText('DescriptionText')).toBeInTheDocument();
    expect(screen.getByText('DialogFooter')).toBeInTheDocument();
    expect(screen.getByText('PauseDialog')).toBeInTheDocument();
    expect(screen.getByText('PauseDialogHeader')).toBeInTheDocument();
    expect(screen.getByText('PauseDialogContent')).toBeInTheDocument();
    expect(screen.getByText('PauseDescription')).toBeInTheDocument();
    expect(screen.getByText('PauseHighlight')).toBeInTheDocument();
    expect(screen.getByText('PauseWarningBox')).toBeInTheDocument();
    expect(screen.getByText('PauseWarningText')).toBeInTheDocument();
    expect(screen.getByText('PauseDialogActions')).toBeInTheDocument();
    expect(screen.getByText('ConfirmDialog')).toBeInTheDocument();
    expect(screen.getByText('ConfirmContent')).toBeInTheDocument();
    expect(screen.getByText('ConfirmText')).toBeInTheDocument();
    expect(screen.getByText('ConfirmActions')).toBeInTheDocument();
  });
});

