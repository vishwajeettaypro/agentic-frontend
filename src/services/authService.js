import api from '../config/api';

export const signIn = async (email, password) => {
  const { data } = await api.post('/auth/signin', { email, password });
  return data;
};

export const signUp = async ({ email, password, username, role }) => {
  const { data } = await api.post('/auth/signup', {
    email,
    password,
    username,
    role,
  });
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const signOut = async () => {
  const { data } = await api.post('/auth/signout');
  return data;
};
