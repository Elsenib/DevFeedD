import axios from 'axios';
import { API_BASE_URL } from '../constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export function setToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}

export async function register(name, email, password) {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data;
}

export async function fetchPosts() {
  const response = await api.get('/posts');
  return response.data;
}

export async function fetchPostById(postId) {
  const response = await api.get(`/posts/${postId}`);
  return response.data;
}

export async function addComment(postId, text) {
  const response = await api.post(`/posts/${postId}/comments`, { text });
  return response.data;
}

export async function toggleLike(postId) {
  const response = await api.post(`/posts/${postId}/like`);
  return response.data;
}

export async function fetchProfile() {
  const response = await api.get('/profile');
  return response.data;
}

export async function fetchConversations() {
  const response = await api.get('/conversations');
  return response.data;
}

export default {
  setToken,
  login,
  register,
  fetchPosts,
  fetchPostById,
  addComment,
  toggleLike,
  fetchProfile,
  fetchConversations,
};
