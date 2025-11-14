import { fetchUtils } from 'ra-core';

const apiUrl = 'http://localhost:5001/api';
const baseUrl = 'http://localhost:5001';

// Convert relative image URLs to full URLs for admin panel
const convertImageUrls = (item) => {
  if (item.images && Array.isArray(item.images)) {
    item.images = item.images.map(image => ({
      ...image,
      url: image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`
    }));
  }
  return item;
};

const httpClient = (url, options = {}) => {
  if (!options.headers) {
    options.headers = new Headers({ Accept: 'application/json' });
  }
  
  // Add JWT token to requests
  const token = localStorage.getItem('token');
  if (token) {
    options.headers.set('Authorization', `Bearer ${token}`);
  }
  
  return fetchUtils.fetchJson(url, options);
};

const dataProvider = {
  getList: (resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const query = {
      page: page,
      limit: perPage,
      sortBy: field,
      sortOrder: order.toLowerCase(),
      ...params.filter,
    };

    // Use admin endpoint for reviews
    let url;
    if (resource === 'reviews') {
      url = `${apiUrl}/${resource}/admin/all?${new URLSearchParams(query).toString()}`;
    } else {
      url = `${apiUrl}/${resource}?${new URLSearchParams(query).toString()}`;
    }

    return httpClient(url).then(({ headers, json }) => {
      // Handle different response formats for different resources
      let data, total;
      
      if (resource === 'products') {
        data = json.products || json.data || json;
        total = json.pagination?.totalProducts || json.total || data.length;
      } else if (resource === 'orders') {
        // Orders endpoint now returns structured data
        data = Array.isArray(json) ? json : json.data || json;
        total = json.total || data.length;
      } else if (resource === 'users') {
        // Users endpoint now returns structured data
        data = Array.isArray(json) ? json : json.data || json;
        total = json.total || data.length;
      } else if (resource === 'reviews') {
        // For reviews, use admin endpoint
        data = json.reviews || json.data || json;
        total = json.pagination?.totalReviews || json.total || data.length;
      } else {
        data = json.data || json;
        total = json.total || data.length;
      }

      return {
        data: data.map(item => convertImageUrls({ ...item, id: item._id })),
        total: total,
      };
    });
  },

  getOne: (resource, params) => {
    const url = resource === 'products' 
      ? `${apiUrl}/${resource}/id/${params.id}`
      : `${apiUrl}/${resource}/${params.id}`;
    
    return httpClient(url).then(({ json }) => ({
      data: convertImageUrls({ ...json, id: json._id }),
    }));
  },

  getMany: (resource, params) => {
    const query = {
      filter: JSON.stringify({ id: params.ids }),
    };
    const url = `${apiUrl}/${resource}?${new URLSearchParams(query).toString()}`;
    return httpClient(url).then(({ json }) => {
      const data = json.data || json;
      return { data: data.map(item => convertImageUrls({ ...item, id: item._id })) };
    });
  },

  getManyReference: (resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const query = {
      page: page,
      limit: perPage,
      sortBy: field,
      sortOrder: order.toLowerCase(),
      [params.target]: params.id,
      ...params.filter,
    };

    const url = `${apiUrl}/${resource}?${new URLSearchParams(query).toString()}`;

    return httpClient(url).then(({ json }) => {
      const data = json.data || json;
      return {
        data: data.map(item => convertImageUrls({ ...item, id: item._id })),
        total: json.total || data.length,
      };
    });
  },

  create: (resource, params) => {
    const { id, ...data } = params.data;
    return httpClient(`${apiUrl}/${resource}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(({ json }) => ({
      data: convertImageUrls({ ...json, id: json._id }),
    }));
  },

  update: (resource, params) => {
    const { id, action, ...data } = params.data;
    
    // Handle order processing actions
    if (resource === 'orders' && action) {
      return httpClient(`${apiUrl}/${resource}/${params.id}/process`, {
        method: 'PUT',
        body: JSON.stringify({ action }),
      }).then(({ json }) => ({
        data: { ...json.order, id: json.order._id },
      }));
    }
    
    // Regular update
    return httpClient(`${apiUrl}/${resource}/${params.id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then(({ json }) => ({
      data: convertImageUrls({ ...json, id: json._id }),
    }));
  },

  updateMany: (resource, params) => {
    const query = {
      filter: JSON.stringify({ id: params.ids }),
    };
    return httpClient(`${apiUrl}/${resource}?${new URLSearchParams(query).toString()}`, {
      method: 'PUT',
      body: JSON.stringify(params.data),
    }).then(({ json }) => ({ data: params.ids }));
  },

  delete: (resource, params) =>
    httpClient(`${apiUrl}/${resource}/${params.id}`, {
      method: 'DELETE',
    }).then(({ json }) => ({ data: convertImageUrls({ ...json, id: json._id }) })),

  deleteMany: (resource, params) => {
    const query = {
      filter: JSON.stringify({ id: params.ids }),
    };
    return httpClient(`${apiUrl}/${resource}?${new URLSearchParams(query).toString()}`, {
      method: 'DELETE',
    }).then(({ json }) => ({ data: params.ids }));
  },
};

export default dataProvider;