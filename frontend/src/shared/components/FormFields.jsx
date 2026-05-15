import { useMediaQuery, useTheme } from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";


export const isSmallScreen = () => {
    const theme = useTheme();
    return useMediaQuery(theme.breakpoints.down('md'))
}

// TEXT FIELD
export const TextInputField = ({
    name,
    label,
    control,
    placeholder = "",
    input_type,
    type = "text",
    maxLength = 50,
    disabled,
}) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
                <TextField
                    {...restField}
                    id={name}
                    name={name}
                    label={label}
                    type={type}
                    disabled={disabled}
                    variant="filled"
                    value={value}
                    onChange={(event) => {
                        onChange(event.target.value);
                    }}
                    fullWidth
                    placeholder={input_type === "date" ? "" : placeholder}
                    InputProps={{
                        disableUnderline: true,
                        inputMode: "text",
                        sx: {
                            border: "1px solid silver",
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            backgroundColor: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "& input::placeholder": {
                                fontSize: "0.9rem",
                            },
                        },
                        autoComplete: "off",
                        autoCorrect: "off",
                        inputProps: { maxLength: maxLength },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                    }}
                    sx={{
                        // maxWidth: "500px",
                        width: "100%",
                        "& .MuiFilledInput-root": {
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                        },
                    }}
                />
            )}
        />
    );
};

// PASSWORD FIELD
export const PasswordInputField = ({
    name,
    label,
    control,
    placeholder = "",
    maxLength = 50,
    disabled,
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
                <TextField
                    {...restField}
                    id={name}
                    name={name}
                    label={label}
                    type={showPassword ? 'text' : 'password'}
                    disabled={disabled}
                    variant="filled"
                    value={value}
                    onKeyDown={(event) => {
                        const key = event.key;
                        // Allow control keys
                        if (["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
                        // Prevent spaces in password fields
                        if (key === ' ') {
                            event.preventDefault();
                        }
                    }}
                    onChange={(event) => {
                        let newValue = event.target.value;
                        // Remove spaces from password
                        newValue = newValue.replace(/\s/g, "");
                        onChange(newValue);
                    }}
                    fullWidth
                    placeholder={placeholder}
                    InputProps={{
                        disableUnderline: true,
                        endAdornment: (
                            <IconButton
                                aria-label="toggle password visibility"
                                onClick={handleClickShowPassword}
                                onMouseDown={handleMouseDownPassword}
                                edge="end"
                                sx={{ marginRight: 1 }}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </IconButton>
                        ),
                        sx: {
                            border: "1px solid silver",
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            backgroundColor: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "& input::placeholder": {
                                fontSize: "0.9rem",
                            },
                        },
                        autoComplete: "off",
                        autoCorrect: "off",
                        inputProps: { maxLength: maxLength },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                    }}
                    sx={{
                        // maxWidth: "500px",
                        width: "100%",
                        "& .MuiFilledInput-root": {
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                        },
                    }}
                />
            )}
        />
    );
};

// DATE FIELD - Specialized for date inputs
export const DateInputField = ({
    name,
    label,
    control,
    placeholder = "",
    disabled = false,
    maxLength = 50,
}) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
                <TextField
                    {...restField}
                    id={name}
                    name={name}
                    label={label}
                    type="date"
                    disabled={disabled}
                    variant="filled"
                    value={value || ""}
                    onKeyDown={(event) => {
                        // Prevent all keyboard input except Tab for accessibility
                        if (event.key === "Tab") return;
                        event.preventDefault();
                    }}
                    onChange={(event) => {
                        const newValue = event.target.value;

                        // Only allow date selection from picker, validate year range
                        if (newValue) {
                            const dateObj = new Date(newValue);
                            const isValidDate = !isNaN(dateObj.getTime());

                            if (isValidDate) {
                                const year = dateObj.getFullYear();
                                // Validate year to be between 1900-2100
                                if (year >= 1900 && year <= 2100) {
                                    onChange(newValue);
                                }
                                // Don't update if year is out of range
                            }
                        } else {
                            // Allow clearing the field
                            onChange(newValue);
                        }
                    }}
                    fullWidth
                    placeholder=""
                    InputProps={{
                        disableUnderline: true,
                        sx: {
                            border: "1px solid silver",
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            backgroundColor: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "& input::placeholder": {
                                fontSize: "0.9rem",
                            },
                        },
                        autoComplete: "off",
                        autoCorrect: "off",
                        inputProps: { maxLength: maxLength },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                        shrink: true,
                    }}
                    sx={{
                        width: "100%",
                        "& .MuiFilledInput-root": {
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            cursor: "pointer",
                        },
                        "& input[type='date']": {
                            cursor: "pointer",
                            "&::-webkit-calendar-picker-indicator": {
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                width: "100%",
                                height: "100%",
                                opacity: 0,
                                cursor: "pointer",
                            },
                        },
                    }}
                />
            )}
        />
    );
};

// ENDPOINT NAME FIELD - Specialized for API endpoint names
export const EndpointNameInputField = ({
    name,
    label,
    control,
    placeholder = "",
    maxLength = 50,
    disabled,
}) => {
    // Allowed characters for API endpoint names: letters, numbers, underscores, hyphens
    const allowedChars = /^[a-zA-Z0-9_-]$/;

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
                <TextField
                    {...restField}
                    id={name}
                    name={name}
                    label={label}
                    type="text"
                    disabled={disabled}
                    variant="filled"
                    value={value}
                    onKeyDown={(event) => {
                        const key = event.key;
                        // Allow control keys
                        if (["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight"].includes(key)) return;
                        // Allow only valid endpoint name characters
                        if (!allowedChars.test(key)) {
                            event.preventDefault();
                        }
                    }}
                    onChange={(event) => {
                        let newValue = event.target.value;
                        // Filter to only allow valid endpoint name characters
                        newValue = newValue.replace(/[^a-zA-Z0-9_-]/g, "");
                        onChange(newValue);
                    }}
                    fullWidth
                    placeholder={placeholder}
                    InputProps={{
                        disableUnderline: true,
                        sx: {
                            border: "1px solid silver",
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            backgroundColor: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "& input::placeholder": {
                                fontSize: "0.9rem",
                            },
                        },
                        autoComplete: "off",
                        autoCorrect: "off",
                        inputProps: { maxLength: maxLength },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                    }}
                    sx={{
                        width: "100%",
                        "& .MuiFilledInput-root": {
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "&.Mui-disabled": {
                                backgroundColor: "#f5f5f5",
                                color: "#9e9e9e",
                                "& input": {
                                    color: "#9e9e9e",
                                    WebkitTextFillColor: "#9e9e9e",
                                },
                            },
                        },
                    }}
                />
            )}
        />
    );
};

// VERSION INPUT FIELD - Specialized for semantic versioning (v1.0.0)
export const VersionInputField = ({
    name,
    label,
    control,
    placeholder = "1.0.0",
    maxLength = 8, // Max length for v99.99.99 format
    disabled,
}) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
                <TextField
                    {...restField}
                    id={name}
                    name={name}
                    label={label}
                    type="text"
                    disabled={disabled}
                    variant="filled"
                    value={value}
                    onKeyDown={(event) => {
                        const key = event.key;
                        // Allow control keys
                        if (["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight"].includes(key)) return;
                        // Allow only numbers, dots, and 'v' (for version prefix)
                        if (!/^[0-9.v]$/.test(key)) {
                            event.preventDefault();
                        }
                    }}
                    onChange={(event) => {
                        let newValue = event.target.value;

                        // Remove any invalid characters except numbers, dots, and 'v'
                        newValue = newValue.replace(/[^0-9.v]/g, "");

                        // Ensure 'v' can only be at the beginning
                        if (newValue.includes('v')) {
                            const vIndex = newValue.indexOf('v');
                            if (vIndex > 0) {
                                // Remove 'v' if it's not at the beginning
                                newValue = newValue.replace(/v/g, '');
                            } else {
                                // Keep only the first 'v' at the beginning
                                const parts = newValue.split('v');
                                newValue = 'v' + parts.slice(1).join('');
                            }
                        }

                        // Prevent multiple consecutive dots
                        newValue = newValue.replace(/\.{2,}/g, '.');

                        // Prevent starting with dot (unless prefixed with v)
                        if (newValue.startsWith('.')) {
                            newValue = newValue.substring(1);
                        }
                        if (newValue.startsWith('v.')) {
                            newValue = 'v' + newValue.substring(2);
                        }

                        onChange(newValue);
                    }}
                    fullWidth
                    placeholder={placeholder}
                    InputProps={{
                        disableUnderline: true,
                        sx: {
                            border: "1px solid silver",
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            backgroundColor: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "& input::placeholder": {
                                fontSize: "0.9rem",
                            },
                        },
                        autoComplete: "off",
                        autoCorrect: "off",
                        inputProps: { maxLength: maxLength },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                    }}
                    sx={{
                        width: "100%",
                        "& .MuiFilledInput-root": {
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "&.Mui-disabled": {
                                backgroundColor: "#f5f5f5",
                                color: "#9e9e9e",
                                "& input": {
                                    color: "#9e9e9e",
                                    WebkitTextFillColor: "#9e9e9e",
                                },
                            },
                        },
                    }}
                />
            )}
        />
    );
};


// ALPHA NUMERIC FIELD
export const AlphaNumericInputField = ({
    name,
    label,
    control,
    placeholder = "",
    maxLength = 50,
    input_type,
    type = "text",
    hyphonAllowed,
}) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => {
                return (
                    <TextField
                        {...restField}
                        id={name}
                        name={name}
                        label={label}
                        type={type}
                        variant="filled"
                        value={value}
                        onKeyDown={(event) => {
                            if (type === "text") {
                                const keyValue = event.key;
                                const Validation = hyphonAllowed
                                    ? /^[a-zA-Z0-9-]*$/
                                    : /^[a-zA-Z0-9]*$/;
                                // Allow backspace key, enter key, and tab key
                                if (["Backspace", "Enter", "Tab"].includes(event.key)) return;
                                if (!Validation.test(keyValue)) event.preventDefault();
                            }
                        }}
                        onChange={(event) => {
                            let newValue = event.target.value;
                            if (type === "text") {
                                const validationRegex = hyphonAllowed
                                    ? /[^a-zA-Z0-9-]/g
                                    : /[^a-zA-Z0-9]/g;
                                newValue = newValue.replace(validationRegex, ""); // Remove invalid characters dynamically
                            }
                            onChange(newValue); // Update the field value in the form state
                        }}
                        fullWidth
                        placeholder={input_type === "date" ? "" : placeholder}
                        InputProps={{
                            disableUnderline: true,
                            sx: {
                                border: "1px solid silver",
                                borderRadius: "7px",
                                fontSize: "1.1rem",
                                height: "60px",
                                backgroundColor: "white",
                                fontWeight: 500,
                                "&:hover": { backgroundColor: "white" },
                                "&.Mui-focused": { backgroundColor: "white" },
                                "& input::placeholder": {
                                    fontSize: "0.9rem",
                                },
                            },
                            autoComplete: "off",
                            autoCorrect: "off",
                            inputProps: { maxLength: maxLength },
                        }}
                        InputLabelProps={{
                            sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                        }}
                        sx={{
                            // maxWidth: "500px",
                            width: "100%",
                            "& .MuiFilledInput-root": {
                                backgroundColor: "white",
                                "&:hover": { backgroundColor: "white" },
                                "&.Mui-focused": { backgroundColor: "white" },
                            },
                        }}
                    />
                );
            }}
        />
    )
};

// TEXTAREA FIELD
export const MultiLineTextInputField = ({ name, label, control, placeholder, maxLength = 100, rows }) => (
    <Controller
        name={name}
        control={control}
        render={({ field }) => (
            <TextField
                {...field}
                id={name}
                name={name}
                label={label}
                variant="filled"
                fullWidth
                multiline
                rows={rows}
                placeholder={placeholder}
                sx={{
                    // maxWidth: "500px",
                    width: "100%",
                    fontWeight: 500,
                    "& .MuiFilledInput-root": {
                        backgroundColor: "white",
                        "&:hover": {
                            backgroundColor: "white", // Keep white on hover
                        },
                        "&.Mui-focused": {
                            backgroundColor: "white", // Keep white on focus
                        },
                    },
                }}
                InputProps={{
                    disableUnderline: true, // Remove underline like in NicInput
                    sx: {
                        border: "1px solid silver",
                        borderRadius: "7px",
                        fontSize: "1.1rem",
                        backgroundColor: "white", // Make sure it's white
                        "&:hover": {
                            backgroundColor: "white",
                        },
                        "&.Mui-focused": {
                            backgroundColor: "white", // Maintain white on focus
                        },
                        "& textarea::placeholder": {
                            fontSize: "0.9rem",
                        },
                    },
                    autoComplete: "off", // Disable autocomplete
                    autoCorrect: "off", // Disable browser correction (especially for mobile)
                }}
                inputProps={{ maxLength: maxLength }}
                InputLabelProps={{
                    sx: {
                        fontSize: "0.95rem",
                        color: "#666666",
                        marginTop: "5px",
                    },
                }}
            />
        )}
    />
);

// NUMBER FIELDS
export const NumberInputField = ({
    name,
    control,
    label,
    format,
    placeholder,
    inputMode,
    autoFocus = false,
    maxLength = 50,
    disabled = false,
}) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => {
                const handleChange = (event) => {
                    // Ensure only numbers are entered
                    const value = event.target.value.replace(/\D/g, "");
                    field.onChange(value);
                };

                const handleKeyDown = (event) => {
                    // Allow paste
                    if (event.ctrlKey && event.key === 'v') return;
                    // Allow backspace, enter, tab
                    if (
                        event.keyCode === 8 ||
                        event.keyCode === 13 ||
                        event.keyCode === 9
                    )
                        return;
                    // Prevent non-numeric key presses
                    if (!/\d/.test(event.key)) event.preventDefault();
                };
                return (
                    <TextField
                        {...field}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        id={name}
                        name={name}
                        label={label}
                        type={"text"}
                        variant="filled"
                        inputMode="numeric"
                        disabled={disabled}
                        inputProps={{
                            inputMode: "numeric",
                            autoComplete: "off",
                            autoCorrect: "off",
                            maxLength: maxLength,
                        }}
                        fullWidth
                        placeholder={placeholder}
                        InputProps={{
                            disableUnderline: true,
                            sx: {
                                border: "1px solid silver",
                                borderRadius: "7px",
                                fontSize: "1.1rem",
                                height: "60px",
                                // maxWidth: "500px",
                                fontWeight: 500,
                                width: "100%",
                                backgroundColor: "white",
                                "&:hover": {
                                    backgroundColor: "white",
                                },
                                "&.Mui-focused": {
                                    backgroundColor: "white",
                                },
                                "& input::placeholder": {
                                    fontSize: "0.9rem",
                                },
                            },
                        }}
                        InputLabelProps={{
                            sx: {
                                fontSize: "0.95rem",
                                color: "#666666",
                                marginTop: "5px",
                            },
                        }}
                        sx={{
                            // maxWidth: "500px",
                            width: "100%",
                            "& .MuiFilledInput-root": {
                                backgroundColor: "white",
                                "&:hover": { backgroundColor: "white" },
                                "&.Mui-focused": { backgroundColor: "white" },
                            },
                        }}
                    />
                );
            }}
        />
    );
};

// DELIMITER FIELD - Specialized for CSV delimiters
export const DelimiterInputField = ({
    name,
    label,
    control,
    placeholder = ",",
    disabled,
}) => {
    // Common CSV delimiters
    const allowedDelimiters = [',', ';', '|', '\t', ':', ' ', '.', '_', '-', '~', '#', '@', '!', '$', '%', '^', '&', '*'];

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
                <TextField
                    {...restField}
                    id={name}
                    name={name}
                    label={label}
                    type="text"
                    disabled={disabled}
                    variant="filled"
                    value={value}
                    onKeyDown={(event) => {
                        const key = event.key;
                        // Allow control keys
                        if (["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight"].includes(key)) return;
                        // Allow only valid delimiters
                        if (!allowedDelimiters.includes(key)) {
                            event.preventDefault();
                        }
                    }}
                    onChange={(event) => {
                        let newValue = event.target.value;
                        // Filter to only allow valid delimiter characters and limit to 1 character
                        newValue = newValue
                            .split('')
                            .filter(char => allowedDelimiters.includes(char))
                            .slice(0, 1) // Only allow 1 character
                            .join('');
                        onChange(newValue);
                    }}
                    fullWidth
                    placeholder={placeholder}
                    InputProps={{
                        disableUnderline: true,
                        inputMode: "text",
                        sx: {
                            border: "1px solid silver",
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            backgroundColor: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "& input::placeholder": {
                                fontSize: "0.9rem",
                            },
                        },
                        autoComplete: "off",
                        autoCorrect: "off",
                        inputProps: {
                            maxLength: 1
                        },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                    }}
                    sx={{
                        width: "100%",
                        "& .MuiFilledInput-root": {
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                        },
                    }}
                />
            )}
        />
    );
};

// DATABASE TABLE NAME INPUT FIELD - Specialized for database table names
export const DatabaseTableInputField = ({
    name,
    label,
    control,
    placeholder = "e.g: customers_2025",
    maxLength = 49,
    disabled,
}) => {
    // Allowed characters for database table names: lowercase letters, numbers, underscores
    const allowedChars = /^[a-z0-9_]$/;

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
                <TextField
                    {...restField}
                    id={name}
                    name={name}
                    label={label}
                    type="text"
                    disabled={disabled}
                    variant="filled"
                    value={value}
                    onKeyDown={(event) => {
                        const key = event.key;
                        // Allow control keys
                        if (["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight"].includes(key)) return;

                        // Allow only valid table name characters (lowercase letters, numbers, underscores)
                        if (!/^[a-zA-Z0-9_]$/.test(key)) {
                            event.preventDefault();
                        }
                    }}
                    onChange={(event) => {
                        let newValue = event.target.value;

                        // Convert to lowercase and filter to only allow valid table name characters
                        newValue = newValue.toLowerCase().replace(/[^a-z0-9_]/g, "");

                        // Ensure it starts with a letter (prevent starting with number or underscore)
                        if (newValue.length > 0 && !/^[a-z]/.test(newValue)) {
                            // If first character is not a letter, remove it
                            newValue = newValue.replace(/^[^a-z]+/, '');
                        }

                        onChange(newValue);
                    }}
                    fullWidth
                    placeholder={placeholder}
                    InputProps={{
                        disableUnderline: true,
                        sx: {
                            border: "1px solid silver",
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            backgroundColor: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "& input::placeholder": {
                                fontSize: "0.9rem",
                            },
                        },
                        autoComplete: "off",
                        autoCorrect: "off",
                        inputProps: { maxLength: maxLength },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                    }}
                    sx={{
                        width: "100%",
                        "& .MuiFilledInput-root": {
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "&.Mui-disabled": {
                                backgroundColor: "#f5f5f5",
                                color: "#9e9e9e",
                                "& input": {
                                    color: "#9e9e9e",
                                    WebkitTextFillColor: "#9e9e9e",
                                },
                            },
                        },
                    }}
                />
            )}
        />
    );
};

// HOST INPUT FIELD - Specialized for SFTP host (IP addresses and domain names)
export const HostInputField = ({
    name,
    label,
    control,
    placeholder = "192.168.1.1",
    maxLength = 255,
    disabled,
}) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
                <TextField
                    {...restField}
                    id={name}
                    name={name}
                    label={label}
                    type="text"
                    disabled={disabled}
                    variant="filled"
                    value={value}
                    onChange={(event) => {
                        onChange(event.target.value);
                    }}
                    fullWidth
                    placeholder={placeholder}
                    InputProps={{
                        disableUnderline: true,
                        sx: {
                            border: "1px solid silver",
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            backgroundColor: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "& input::placeholder": {
                                fontSize: "0.9rem",
                            },
                        },
                        autoComplete: "off",
                        autoCorrect: "off",
                        inputProps: { maxLength: maxLength },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                    }}
                    sx={{
                        width: "100%",
                        "& .MuiFilledInput-root": {
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                        },
                    }}
                />
            )}
        />
    );
};

// FILE PATH INPUT FIELD - Specialized for SFTP file paths
export const FilePathInputField = ({
    name,
    label,
    control,
    placeholder = "/inbound/data_*.csv",
    maxLength = 100,
    disabled,
}) => {
    // Valid characters for file paths: alphanumeric, /, _, -, ., *
    const isValidPathChar = (char) => {
        return /^[a-zA-Z0-9\/\-._*]$/.test(char);
    };

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
                <TextField
                    {...restField}
                    id={name}
                    name={name}
                    label={label}
                    type="text"
                    disabled={disabled}
                    variant="filled"
                    value={value}
                    onKeyDown={(event) => {
                        const key = event.key;
                        // Allow control keys
                        if (["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;

                        // Prevent spaces and invalid path characters
                        if (key === ' ' || !isValidPathChar(key)) {
                            event.preventDefault();
                        }
                    }}
                    onChange={(event) => {
                        let newValue = event.target.value;

                        // Remove spaces and invalid path characters
                        newValue = newValue.replace(/[^a-zA-Z0-9\/\-._*]/g, "");

                        // Ensure path starts with /
                        if (newValue.length > 0 && !newValue.startsWith('/')) {
                            newValue = '/' + newValue;
                        }

                        // Prevent double slashes (except at the beginning)
                        newValue = newValue.replace(/\/+/g, '/');

                        onChange(newValue);
                    }}
                    fullWidth
                    placeholder={placeholder}
                    InputProps={{
                        disableUnderline: true,
                        sx: {
                            border: "1px solid silver",
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            backgroundColor: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "& input::placeholder": {
                                fontSize: "0.9rem",
                            },
                        },
                        autoComplete: "off",
                        autoCorrect: "off",
                        inputProps: { maxLength: maxLength },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                    }}
                    sx={{
                        width: "100%",
                        "& .MuiFilledInput-root": {
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                        },
                    }}
                />
            )}
        />
    );
};

// URL INPUT FIELD - Specialized for URL inputs
export const URLInputField = ({
    name,
    label,
    control,
    placeholder = "https://api.example.com/endpoint",
    maxLength = 500,
    disabled,
}) => {
    // Characters allowed in URLs
    const isValidURLChar = (char) => {
        // Allow alphanumeric, common URL special characters, and no spaces
        return /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]$/.test(char);
    };

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
                <TextField
                    {...restField}
                    id={name}
                    name={name}
                    label={label}
                    type="url"
                    disabled={disabled}
                    variant="filled"
                    value={value}
                    onKeyDown={(event) => {
                        const key = event.key;
                        // Allow control keys
                        if (["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
                        // Prevent spaces and invalid URL characters
                        if (key === ' ' || !isValidURLChar(key)) {
                            event.preventDefault();
                        }
                    }}
                    onChange={(event) => {
                        let newValue = event.target.value;
                        // Remove spaces and invalid URL characters
                        newValue = newValue.replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g, "");
                        onChange(newValue);
                    }}
                    fullWidth
                    placeholder={placeholder}
                    InputProps={{
                        disableUnderline: true,
                        inputMode: "url",
                        sx: {
                            border: "1px solid silver",
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            backgroundColor: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "& input::placeholder": {
                                fontSize: "0.9rem",
                            },
                        },
                        autoComplete: "url",
                        autoCorrect: "off",
                        inputProps: { maxLength: maxLength },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                    }}
                    sx={{
                        width: "100%",
                        "& .MuiFilledInput-root": {
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                        },
                    }}
                />
            )}
        />
    );
};

// TRANSACTION TYPE INPUT FIELD - Specialized for transaction types (alphanumeric with - _ /)
export const TransactionTypeInputField = ({
    name,
    label,
    control,
    placeholder = "pacs.008",
    maxLength = 50,
    disabled,
}) => {
    // Valid characters: alphanumeric and special characters: - _ /
    const isValidChar = (char) => {
        return /^[a-zA-Z0-9\-_\/]$/.test(char);
    };

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
                <TextField
                    {...restField}
                    id={name}
                    name={name}
                    label={label}
                    type="text"
                    disabled={disabled}
                    variant="filled"
                    value={value}
                    onKeyDown={(event) => {
                        const key = event.key;
                        // Allow control keys
                        if (["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;

                        // Allow only valid characters
                        if (!isValidChar(key)) {
                            event.preventDefault();
                        }
                    }}
                    onChange={(event) => {
                        let newValue = event.target.value;

                        // Remove invalid characters (keep only alphanumeric and - _ /)
                        newValue = newValue.replace(/[^a-zA-Z0-9\-_\/]/g, "");

                        onChange(newValue);
                    }}
                    fullWidth
                    placeholder={placeholder}
                    InputProps={{
                        disableUnderline: true,
                        sx: {
                            border: "1px solid silver",
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            backgroundColor: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "& input::placeholder": {
                                fontSize: "0.9rem",
                            },
                        },
                        autoComplete: "off",
                        autoCorrect: "off",
                        inputProps: { maxLength: maxLength },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                    }}
                    sx={{
                        width: "100%",
                        "& .MuiFilledInput-root": {
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                        },
                    }}
                />
            )}
        />
    );
};

// API PATH INPUT FIELD - Specialized for API endpoint paths
export const ApiPathInputField = ({
    name,
    label,
    control,
    placeholder = "/customer/data",
    maxLength = 50,
    disabled,
}) => {
    // Valid characters for API paths: alphanumeric, /, _, -, and numbers
    const isValidApiPathChar = (char) => {
        return /^[a-zA-Z0-9\/_-]$/.test(char);
    };

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
                <TextField
                    {...restField}
                    id={name}
                    name={name}
                    label={label}
                    type="text"
                    disabled={disabled}
                    variant="filled"
                    value={value}
                    onKeyDown={(event) => {
                        const key = event.key;
                        // Allow control keys
                        if (["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;

                        // Prevent spaces and invalid API path characters
                        if (key === ' ' || !isValidApiPathChar(key)) {
                            event.preventDefault();
                        }
                    }}
                    onChange={(event) => {
                        let newValue = event.target.value;

                        // Remove spaces and invalid API path characters
                        newValue = newValue.replace(/[^a-zA-Z0-9\/_-]/g, "");

                        // Ensure path starts with /
                        if (newValue.length > 0 && !newValue.startsWith('/')) {
                            newValue = '/' + newValue;
                        }

                        // Prevent double slashes (except at the beginning)
                        newValue = newValue.replace(/\/+/g, '/');

                        // Prevent ending with slash (but allow during typing for subdirectories)
                        // This will be handled by validation, not input filtering

                        onChange(newValue);
                    }}
                    fullWidth
                    placeholder={placeholder}
                    InputProps={{
                        disableUnderline: true,
                        sx: {
                            border: "1px solid silver",
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            backgroundColor: "white",
                            fontWeight: 500,
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "& input::placeholder": {
                                fontSize: "0.9rem",
                            },
                        },
                        autoComplete: "off",
                        autoCorrect: "off",
                        inputProps: { maxLength: maxLength },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                    }}
                    sx={{
                        width: "100%",
                        "& .MuiFilledInput-root": {
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: "white" },
                            "&.Mui-focused": { backgroundColor: "white" },
                            "&.Mui-disabled": {
                                backgroundColor: "#f5f5f5",
                                color: "#9e9e9e",
                                "& input": {
                                    color: "#9e9e9e",
                                    WebkitTextFillColor: "#9e9e9e",
                                },
                            },
                        },
                    }}
                />
            )}
        />
    );
};

// SELECT FIELD
export const SelectField = ({
    name,
    label,
    control,
    placeholder,
    options,
    disabled,
}) => {
    const isSmall = isSmallScreen();

    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <TextField
                    {...field}
                    id="standard-select"
                    select
                    label={label}
                    variant="filled"
                    fullWidth
                    disabled={disabled}
                    placeholder={placeholder}
                    SelectProps={{
                        MenuProps: {
                            PaperProps: {
                                sx: isSmall ? {
                                    maxWidth: "500px",
                                    width: "100%",
                                    minWidth: "100%",
                                } : {},
                            },
                            anchorOrigin: {
                                vertical: "bottom",
                                horizontal: "left",
                            },
                            transformOrigin: {
                                vertical: "top",
                                horizontal: "left",
                            },
                            sx: isSmall ? {
                                "& .MuiPaper-root": {
                                    maxWidth: "500px !important",
                                    width: "100% !important",
                                    minWidth: "100% !important",
                                    marginLeft: "0px !important",
                                    marginRight: "0px !important",
                                    left: "0px !important",
                                },
                            } : {},
                        },
                    }}
                    sx={{
                        "& .MuiFilledInput-root": {
                            background: "white",
                        },
                        "& .MuiSelect-select.MuiInputBase-input.MuiFilledInput-input:focus":
                        {
                            backgroundColor: "white",
                        },
                    }}
                    InputProps={{
                        disableUnderline: true,
                        sx: {
                            border: "1px solid silver", // Correctly apply the border here
                            borderRadius: "7px",
                            fontSize: "1.1rem",
                            height: "60px",
                            // maxWidth: "500px",
                            fontWeight: 500,
                            width: "100%",
                            backgroundColor: "white",
                            "&:hover": {
                                backgroundColor: "white",
                            },
                            "&.Mui-focused": {
                                backgroundColor: "white",
                            },
                        },
                    }}
                    InputLabelProps={{
                        sx: {
                            fontSize: "0.95rem",
                            color: "#666666",
                            marginTop: "10px",
                            top: "-5px",
                        },
                    }}
                >
                    {options.map((option) => (
                        <MenuItem
                            key={option.value}
                            value={`${option.value}`}
                        >
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>
            )}
        />
    );
};


// ALPHA NUMERIC FIELD WITH SPACES
export const AlphaNumericInputFieldWithSpaces = ({
    name,
    label,
    control,
    placeholder = "",
    maxLength = 50,
    disabled,
    input_type,
    type = "text",
    hyphonAllowed,
}) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...restField } }) => {
                return (
                    <TextField
                        {...restField}
                        id={name}
                        name={name}
                        label={label}
                        type={type}
                        variant="filled"
                        value={value}
                        disabled={disabled}
                        onKeyDown={(event) => {
                            if (type === "text") {
                                const keyValue = event.key;
                                const Validation = hyphonAllowed
                                    ? /^[a-zA-Z0-9- ]*$/
                                    : /^[a-zA-Z0-9 ]*$/;
                                // Allow backspace key, enter key, and tab key
                                if (["Backspace", "Enter", "Tab"].includes(event.key)) return;
                                if (!Validation.test(keyValue)) event.preventDefault();
                            }
                        }}
                        onChange={(event) => {
                            let newValue = event.target.value;
                            if (type === "text") {
                                const validationRegex = hyphonAllowed
                                    ? /[^a-zA-Z0-9- ]/g
                                    : /[^a-zA-Z0-9 ]/g;
                                newValue = newValue.replace(validationRegex, ""); // Remove invalid characters dynamically
                            }
                            onChange(newValue); // Update the field value in the form state
                        }}
                        fullWidth
                        placeholder={input_type === "date" ? "" : placeholder}
                        InputProps={{
                            disableUnderline: true,
                            sx: {
                                border: "1px solid silver",
                                borderRadius: "7px",
                                fontSize: "1.1rem",
                                height: "60px",
                                backgroundColor: "white",
                                fontWeight: 500,
                                "&:hover": { backgroundColor: "white" },
                                "&.Mui-focused": { backgroundColor: "white" },
                                "& input::placeholder": {
                                    fontSize: "0.9rem",
                                },
                            },
                            autoComplete: "off",
                            autoCorrect: "off",
                            inputProps: { maxLength: maxLength },
                        }}
                        InputLabelProps={{
                            sx: { fontSize: "0.95rem", color: "#666666", marginTop: "5px" },
                        }}
                        sx={{
                            // maxWidth: "500px",
                            width: "100%",
                            "& .MuiFilledInput-root": {
                                backgroundColor: "white",
                                "&:hover": { backgroundColor: "white" },
                                "&.Mui-focused": { backgroundColor: "white" },
                            },
                        }}
                    />
                );
            }}
        />
    )
};