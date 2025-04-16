/**
 * Asset retrieval utilities for STRATO REST API
 */

/**
 * Fetches asset data for a given owner common name user
 * @param {AxiosInstance} apiClient - The API client to use for the request
 * @param {string} ownerCommonName - The owner common name to search for
 * @returns {Promise<{result: Object|null, data: Array}>} - The API result and asset data
 */
const getAssetsForCommonNameUser = async (apiClient, ownerCommonName) => {
    let result = null;
    let data = [];
    
    try {
        const params = { ownerCommonName };
        result = await apiClient.get(
            `/BlockApps-Mercata-Asset`,
            { params }
        );
        
        if (result && result.data) {
            data = result.data;
        }
    } catch (error) {
        console.error('API Error:', error.message);
    }
    
    return { result, data };
};

module.exports = {
    getAssetsForCommonNameUser
};
