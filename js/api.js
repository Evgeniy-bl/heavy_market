import { fetchJSON, getApiBaseURL, deleteResource } from './utils/api.js';
import { PRODUCT_STATUS, isProductPublished } from './utils/product-status.js';

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

  getMessagesBySellerId(sellerId) {
    return fetchJSON(`${baseURL}/messages?sellerId=${encodeURIComponent(sellerId)}&_sort=sentAt&_order=desc`);
  },

  getAllMessages() {
    return fetchJSON(`${baseURL}/messages?_sort=sentAt&_order=desc`);
  },

  createSeller(data) {
    return fetchJSON(`${baseURL}/sellers`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateSeller(id, data) {
    return fetchJSON(`${baseURL}/sellers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
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
      ids.map((id) => deleteResource(`${baseURL}/messages/${encodeURIComponent(id)}`))
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

  updateChatMessage(id, data) {
    return fetchJSON(`${baseURL}/chatMessages/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async markChatMessagesRead(conversationId, sender) {
    const items = await this.getChatMessages(conversationId);
    const pending = items.filter(
      (item) => item.sender === sender && item.status !== 'read'
    );
    await Promise.all(
      pending.map((item) => this.updateChatMessage(item.id, { status: 'read' }))
    );
    return items.map((item) => (
      item.sender === sender ? { ...item, status: 'read' } : item
    ));
  },

  async createProduct(data) {
    return fetchJSON(`${baseURL}/products`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getProductById(id) {
    return fetchJSON(`${baseURL}/products/${encodeURIComponent(id)}`);
  },

  async createProductWithImages(productData, files = []) {
    const formData = new FormData();
    formData.append('data', JSON.stringify(productData));

    files.forEach((file) => {
      formData.append('images', file);
    });

    const response = await fetch(`${baseURL}/api/products-with-images`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      const responseText = await response.text();

      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          message = errorData.message || errorData.error || message;
        } catch {
          message = responseText;
        }
      }

      throw new Error(message);
    }

    return response.json();
  },

  async getProducts(options = {}) {
    const products = await fetchJSON(`${baseURL}/products`);
    if (options.includeInactive) return products || [];
    return (products || []).filter(isProductPublished);
  },

  updateProduct(id, data) {
    return fetchJSON(`${baseURL}/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  approveProduct(id) {
    return this.updateProduct(id, {
      status: PRODUCT_STATUS.PUBLISHED,
      active: true,
      rejectionReason: null,
      publishedAt: new Date().toISOString(),
      moderatedAt: new Date().toISOString()
    });
  },

  rejectProduct(id, reason = '') {
    return this.updateProduct(id, {
      status: PRODUCT_STATUS.REJECTED,
      active: true,
      rejectionReason: reason || null,
      moderatedAt: new Date().toISOString()
    });
  },

  deactivateProduct(id) {
    return this.updateProduct(id, {
      status: PRODUCT_STATUS.INACTIVE,
      active: false
    });
  },

  deleteProduct(id) {
    return this.deactivateProduct(id);
  },

  async deleteChatMessagesByConversation(conversationId) {
    const items = await this.getChatMessages(conversationId);
    if (!Array.isArray(items) || !items.length) return;

    await Promise.all(
      items.map((item) => deleteResource(`${baseURL}/chatMessages/${encodeURIComponent(item.id)}`))
    );
  }
};
