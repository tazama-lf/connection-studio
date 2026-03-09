import * as React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useAuth } from '../../auth/contexts/AuthContext';

export default function UserCard() {
  const { user } = useAuth();

  const primaryRole = React.useMemo(() => {
    if (!user?.claims || user.claims.length === 0) return null;
    const roleMapping: Record<string, string> = {
      'approver': 'Approver',
      'editor': 'Editor',
      'publisher': 'Publisher',
      'exporter': 'Exporter'
    };
    const userRoles = user.claims
      .filter((claim: string) => !!roleMapping[claim])
      .map((claim: string) => roleMapping[claim]);
    return userRoles.length > 0 ? userRoles[0] : null;
  }, [user]);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>{user?.username}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{primaryRole ? `- ${primaryRole}` : ''}</Typography>
    </Box>
  );
}
