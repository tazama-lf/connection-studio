// FILE: Login.tsx

import Logo from '@assets/logo.png';
import tazamaLogo from '@assets/tazamaLogo.svg';
import treeImage from '@assets/treeImage.png';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  IconButton,
  InputAdornment,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom'; // For commented-out API logic
import * as yup from 'yup';
import { isApprover } from '../../../utils/roleUtils';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/authApi';

// --- For commented-out API logic ---
// const login = async (user: string, pass: string) => { console.log(user, pass); return true; };
// const authApi = { decodeToken: (token: string) => ({ claims: 'mock' }) };
// const isApprover = (claims: any) => false;
// ---

const themeColor = '#51BE99';

const schema = yup
  .object({
    username: yup
      .string()
      .required('This Field is Required')
      // .matches(/^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/, 'A valid email address is required.')
      .email('A valid email address is required.'),
    password: yup
      .string()
      .required('This Field is Required')
      .min(6, 'Must be at least 6 characters'),
  })
  .required();

// Define a type for the form data based on the schema
type FormData = yup.InferType<typeof schema>;

export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const handleClickShowPassword = () => setShowPassword((prev) => !prev);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
  };
  const onSubmit = async (data: FormData) => {
    setError('');
    setIsLoading(true);

    try {
      const success = await login(data.username, data.password);
      if (success) {
        const token = localStorage.getItem('authToken');
        if (token) {
          const userData = authApi.decodeToken(token);
          const isUserApprover = userData?.claims
            ? isApprover(userData.claims)
            : false;
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (error: any) {
      const msg = error?.message || '';
      if (
        msg.toLowerCase().includes('unauthorized') ||
        msg.toLowerCase().includes('invalid credentials')
      ) {
        setError('Invalid credentials. Please try again.');
      } else {
        setError('Login failed. Please check your connection and try again.');
      }
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', position: 'relative' }}>
      <CssBaseline />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: `
            linear-gradient(45deg, transparent 49%, ${themeColor} 49%, ${themeColor} 51%, transparent 51%),
            linear-gradient(-45deg, transparent 49%, ${themeColor} 49%, ${themeColor} 51%, transparent 51%)
          `,
          backgroundSize: '40px 40px',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 80% at 0% 100%, #000 50%, transparent 90%), radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)',
          maskImage:
            'radial-gradient(ellipse 80% 80% at 0% 100%, #000 50%, transparent 90%), radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)',
          opacity: 0.25,
        }}
      />

      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          backgroundColor: '#fff',
          color: themeColor,
          position: 'relative',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img src={tazamaLogo} alt="Logo" style={{ height: '30px' }} />
            <Typography
              variant="body1"
              sx={{ fontSize: '0.9rem' }}
            ></Typography>
          </Box>
          <Button
            color="inherit"
            sx={{ textTransform: 'none', fontSize: '0.9rem' }}
          >
            {/* Contact Us */}
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          height: 'calc(100vh - 64px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            flex: { xs: 1, md: 0.5 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              py: 8,
              mx: 4,
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              maxWidth: 450,
              zIndex: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <img src={Logo} alt="Logo" style={{ height: '100px' }} />
            </Box>
            <Typography
              component="h1"
              variant="h5"
              sx={{ fontWeight: 'bold', color: themeColor, fontSize: '2rem' }}
            >
              Tazama Connection Studio
            </Typography>
            <Typography
              component="p"
              sx={{
                fontSize: '12px',
                fontWeight: 'bold',
                mt: 1,
                textAlign: 'center',
              }}
            >
              Please Enter Your Login Credentials To Access The Portal.
            </Typography>

            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              sx={{
                mt: 3,
                width: '100%',
                backgroundColor: 'white',
              }}
            >
              {/* {error && (
                <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
                  {error}
                </Alert>
              )} */}
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Email Address"
                autoComplete="email"
                autoFocus
                // disabled={isLoading}
                {...register('username')}
                error={!!errors.username}
                helperText={errors.username?.message}
                FormHelperTextProps={{
                  sx: {
                    backgroundColor: 'transparent',
                    margin: 0,
                    paddingLeft: 0,
                  },
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                // disabled={isLoading}
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                FormHelperTextProps={{
                  sx: {
                    backgroundColor: 'transparent',
                    margin: 0,
                    paddingLeft: 0,
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? (
                          <AiOutlineEyeInvisible />
                        ) : (
                          <AiOutlineEye />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                // disabled={isLoading}
                sx={{
                  mt: 3,
                  py: 1.5,
                  fontSize: '1rem',
                  backgroundColor: themeColor,
                  '&:hover': {
                    backgroundColor: '#45a786',
                  },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ marginRight: '4px' }}
                >
                  <path d="M10,17V14H3V10H10V7L15,12L10,17M10,2H19A2,2 0 0,1 21,4V20A2,2 0 0,1 19,22H10A2,2 0 0,1 8,20V18H10V20H19V4H10V6H8V4A2,2 0 0,1 10,2Z" />
                </svg>
                {/* {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Login'} */}
                Login
              </Button>
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: '130px' }}
            >
              &copy; {new Date().getFullYear()} Tazama. Powered by Paysys Labs.
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            flex: 0.5,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            height: '100%',
          }}
        >
          <img
            src={treeImage}
            alt="Login visual"
            style={{
              width: '70%',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
