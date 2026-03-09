import React from 'react';
import { Checkbox, FormControlLabel } from '@mui/material';
import { getThemeLightColor } from 'Utils/menu';

const CheckboxField = ({ label, color, checked, handleChange, disabled, size = 20 }) => {
    const themeColor = getThemeLightColor();

    const checkbox = (
        <Checkbox
            sx={{
                '& .MuiSvgIcon-root': { fontSize: size },
                '&.Mui-checked': {
                    color: themeColor ?? color,
                },
                padding: '2px',
            }}
            color={color}
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
        />
    );

    return label ? (
        <FormControlLabel
            sx={{
                '&.MuiFormControlLabel-root': {
                    marginRight: 0,
                    marginBottom: 0,
                    width: 'fit-content',
                    padding: '0 16px',
                },
            }}
            control={checkbox}
            label={label}
            disabled={disabled}
        />
    ) : (
        checkbox
    );
};

export default CheckboxField;
