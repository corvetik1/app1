import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../authActions';
import { RootState } from '../../app/store';
import { Button, TextField, Box } from '@mui/material';

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(login({ username, password }) as any); // Приведение типа для thunk
  };

  if (isAuthenticated) {
    return <div>Вы вошли как {useSelector((state: RootState) => state.auth.user)}</div>;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      <TextField
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
        Войти
      </Button>
    </Box>
  );
};

export default LoginForm;