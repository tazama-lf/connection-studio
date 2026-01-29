import { Box } from '@mui/material';

const ValidationError = ({ message }: { message: string }) => {
  return (
    <Box sx={{ color: 'red', fontSize: '12px', marginTop: '0.2rem' }}>
      {message}
    </Box>
  );
};

export default ValidationError;
