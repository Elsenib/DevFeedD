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

export async function verifyEmailRegistration(email, code) {
  const response = await api.post('/auth/verify-email', { email, code });
  return response.data;
}

export async function socialLogin({ provider, providerId, email, name, avatarUrl }) {
  const response = await api.post('/auth/social-login', {
    provider,
    providerId,
    email,
    name,
    avatarUrl,
  });
  return response.data;
}

export async function updateProfile(profile) {
  const response = await api.patch('/profile', profile);
  return response.data;
}

export async function uploadAvatar({ uri, name = 'avatar.jpg', type = 'image/jpeg' }) {
  const formData = new FormData();
  formData.append('avatar', { uri, name, type });
  const response = await api.post('/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function fetchPosts() {
  const response = await api.get('/posts');
  return response.data;
}

export async function createPost(post) {
  const response = await api.post('/posts', post);
  return response.data;
}

export async function updatePost(postId, post) {
  const response = await api.put(`/posts/${postId}`, post);
  return response.data;
}

export async function deletePost(postId) {
  const response = await api.delete(`/posts/${postId}`);
  return response.data;
}

export async function fetchPostById(postId) {
  const response = await api.get(`/posts/${postId}`);
  return response.data;
}

export async function fetchComments(postId) {
  const response = await api.get(`/posts/${postId}/comments`);
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

export async function unlikePost(postId) {
  const response = await api.delete(`/posts/${postId}/like`);
  return response.data;
}

export async function bookmarkPost(postId) {
  const response = await api.post(`/posts/${postId}/bookmark`);
  return response.data;
}

export async function removeBookmark(postId) {
  const response = await api.delete(`/posts/${postId}/bookmark`);
  return response.data;
}

export async function applyToJob(postId, { coverLetter = '', resumeUrl = '' } = {}) {
  const response = await api.post(`/posts/${postId}/apply`, {
    cover_letter: coverLetter,
    resume_url: resumeUrl,
  });
  return response.data;
}

export async function fetchProfile() {
  const response = await api.get('/profile');
  return response.data;
}

export async function fetchMyPosts() {
  const response = await api.get('/profile/posts');
  return response.data;
}

export async function fetchUserProfile(userId) {
  const response = await api.get(`/profile/${userId}`);
  return response.data;
}

export async function fetchUserPosts(userId) {
  const response = await api.get(`/profile/${userId}/posts`);
  return response.data;
}

export async function searchUsers(query = '') {
  const response = await api.get('/users/search', { params: { q: query } });
  return response.data;
}

export async function searchPosts(query = '') {
  const response = await api.get('/posts/search', { params: { q: query } });
  return response.data;
}

export async function followUser(userId) {
  const response = await api.post(`/users/${userId}/follow`);
  return response.data;
}

export async function unfollowUser(userId) {
  const response = await api.delete(`/users/${userId}/follow`);
  return response.data;
}

export async function fetchConversations() {
  const response = await api.get('/conversations');
  return response.data;
}

export async function fetchConversation(conversationId) {
  const response = await api.get(`/conversations/${conversationId}`);
  return response.data;
}

export async function createConversation({ email, userId }) {
  const response = await api.post('/conversations', { email, userId });
  return response.data;
}

export async function sendMessage(conversationId, text) {
  const response = await api.post(`/conversations/${conversationId}/messages`, { text });
  return response.data;
}

export async function fetchChatRooms() {
  const response = await api.get('/chat/rooms');
  return response.data;
}

export async function createChatRoom({ name, description }) {
  const response = await api.post('/chat/rooms', { name, description });
  return response.data;
}

export async function joinChatRoom(roomId) {
  const response = await api.post(`/chat/rooms/${roomId}/join`);
  return response.data;
}

export async function leaveChatRoom(roomId) {
  const response = await api.post(`/chat/rooms/${roomId}/leave`);
  return response.data;
}

export async function fetchChatMessages(roomId) {
  const response = await api.get(`/chat/rooms/${roomId}/messages`);
  return response.data;
}

export async function sendChatMessage(roomId, text) {
  const response = await api.post(`/chat/rooms/${roomId}/messages`, { text });
  return response.data;
}

export async function fetchSupportConfig() {
  const response = await api.get('/support/config');
  return response.data;
}

export async function createSupportPayment({ receiverId, amount, note }) {
  const response = await api.post('/support/payments', { receiverId, amount, note });
  return response.data;
}

export async function fetchNotifications() {
  const response = await api.get('/notifications');
  return response.data;
}

export async function markNotificationRead(notificationId) {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.patch('/notifications/read-all');
  return response.data;
}

export default {
  setToken,
  login,
  register,
  verifyEmailRegistration,
  socialLogin,
  updateProfile,
  uploadAvatar,
  fetchPosts,
  createPost,
  updatePost,
  deletePost,
  fetchPostById,
  fetchComments,
  addComment,
  toggleLike,
  unlikePost,
  bookmarkPost,
  removeBookmark,
  applyToJob,
  fetchProfile,
  fetchUserProfile,
  fetchUserPosts,
  searchUsers,
  searchPosts,
  followUser,
  unfollowUser,
  fetchConversations,
  fetchConversation,
  createConversation,
  sendMessage,
  fetchChatRooms,
  createChatRoom,
  joinChatRoom,
  leaveChatRoom,
  fetchChatMessages,
  sendChatMessage,
  fetchSupportConfig,
  createSupportPayment,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchMyPosts,
};
