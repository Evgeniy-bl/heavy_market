import { fetchJSON, getApiBaseURL } from './utils/api.js';

const baseURL = getApiBaseURL();

export const API = {
  getUsers() {
    return fetchJSON(`${baseURL}/users`);
  },

  getUserById(id) {
    return fetchJSON(`${baseURL}/users/${encodeURIComponent(id)}`);
  },

  createUser(data) {
    return fetchJSON(`${baseURL}/users`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateUser(id, data) {
    return fetchJSON(`${baseURL}/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  getUserByEmail(email) {
    return fetchJSON(`${baseURL}/users?email=${encodeURIComponent(email)}`);
  },

  getMessagesByUserId(userId) {
    return fetchJSON(`${baseURL}/messages?userId=${encodeURIComponent(userId)}&_sort=sentAt&_order=desc`);
  },

  createMessage(data) {
    return fetchJSON(`${baseURL}/messages`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateMessage(id, data) {
    return fetchJSON(`${baseURL}/messages/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  deleteMessages(ids) {
    return Promise.all(
      ids.map((id) => fetchJSON(`${baseURL}/messages/${encodeURIComponent(id)}`, { method: 'DELETE' }))
    );
  },

  getChatMessages(conversationId) {
    return fetchJSON(
      `${baseURL}/chatMessages?conversationId=${encodeURIComponent(conversationId)}&_sort=sentAt&_order=asc`
    );
  },

  createChatMessage(data) {
    return fetchJSON(`${baseURL}/chatMessages`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteChatMessagesByConversation(conversationId) {
    const items = await this.getChatMessages(conversationId);
    await Promise.all(
      items.map((item) => fetchJSON(`${baseURL}/chatMessages/${encodeURIComponent(item.id)}`, { method: 'DELETE' }))
    );
  }
};
