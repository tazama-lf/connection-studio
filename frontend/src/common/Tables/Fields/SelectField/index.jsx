import React from 'react';
import { MenuItem, Select } from '@mui/material';

const SelectField = ({ color, value, handleChange, options, disabled, placeholder = 'Select...' }) => {
    return (
        <Select
            sx={{
                '& .MuiSelect-select': {
                    padding: '4px 8px ',
                },
                // DROPDOWN INPUT FIELD
                '& .MuiInputBase-input': {
                    fontSize: '12px',
                    marginLeft: '0px !important',
                },
                // CHANGE BORDER COLOR WHEN FOCUSED
                '& .Mui-focused .MuiOutlinedInput-notchedOutline , .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px !important',
                    borderColor: `${color} !important`,
                },
                // CHANGE ICON COLOR
                '& .MuiSelect-icon': {
                    display: 'block',
                    borderColor: `${color} !important`,
                },
                // DISABLED
                '&.Mui-disabled .MuiSelect-select': {
                    backgroundColor: '#F0F0F0',
                    color: '#6d6d6d',
                    WebkitTextFillColor: '#6d6d6d !important',
                },
                '&.Mui-disabled .MuiInputBase-input': {
                    color: '#6d6d6d',
                    WebkitTextFillColor: '#6d6d6d !important',
                },
            }}
            value={value}
            onChange={handleChange}
            fullWidth
            disabled={disabled}
            displayEmpty
            renderValue={(selected) => {
                if (!selected) {
                    return <span style={{ color: '#666666' }}>{placeholder}</span>;
                }

                const selectedOption = options.find((opt) => opt.value === selected);
                return selectedOption?.label ?? '';
            }}
        >
            {options?.map((option) => (
                <MenuItem sx={{ fontSize: '12px' }} key={option.value} value={option.value}>
                    {option.label}
                </MenuItem>
            ))}
        </Select>
    );
};

export default SelectField;
