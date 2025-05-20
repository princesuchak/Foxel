// 重新导出类型
export * from './authApi';
export * from './types';

// 导出fetch客户端
export { fetchApi, BASE_URL } from './fetchClient';

// 导出Auth API
export {
    register,
    login,
    getCurrentUser,
    updateUserInfo,  // 添加导出更新用户信息函数
    saveAuthData,
    clearAuthData,
    isAuthenticated,
    getStoredUser
} from './authApi';

// 导出Picture API
export {
    getPictures,
    favoritePicture,
    unfavoritePicture,
    getUserFavorites,
    uploadPicture,
    deleteMultiplePictures,  // 添加导出删除图片函数
} from './pictureApi';

// 导出Album API
export {
    getAlbums,
    getAlbumById,
    createAlbum,
    updateAlbum,
    deleteAlbum,
    addPictureToAlbum,
    addPicturesToAlbum,
    removePictureFromAlbum
} from './albumApi';

// 导出BackgroundTask API
export {
    getUserTasks,
    getPictureProcessingStatus,
} from './backgroundTaskApi';

// 导出Config API
export {
    getAllConfigs,
    getConfig,
    setConfig,
    deleteConfig,
    hasRole
} from './configApi';

