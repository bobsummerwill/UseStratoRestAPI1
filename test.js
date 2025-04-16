const axios = require("axios");
const { getUserToken } = require("./oauth");
const { marketplaceUrl } = require("./credentials");

/**
 * Function to create an Axios API client
 * @param {string} baseURL - The base URL for the API
 * @returns {AxiosInstance} Configured Axios client
 */
const createApiClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    timeout: 60000, // Timeout set to 60 seconds
  });

  // Request interceptor to attach Authorization token
  client.interceptors.request.use(
    async (config) => {
      try {
        const token = await getUserToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      } catch (error) {
        return Promise.reject(error);
      }
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle errors
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      return Promise.reject(error);
    }
  );

  return client;
};

// Initialize API client
const dbApiClient = createApiClient(`https://${marketplaceUrl}/cirrus/search`);

module.exports = { dbApiClient };
