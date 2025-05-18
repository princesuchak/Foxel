import type { PaginatedResult, PictureResponse, FilteredPicturesRequest, BaseResult } from './types';
import { fetchApi, BASE_URL } from './fetchClient';

// 获取图片列表
export async function getPictures(params: FilteredPicturesRequest = {}): Promise<PaginatedResult<PictureResponse>> {
  // 添加调试日志
  console.log("Search API 请求参数:", params);
  
  // 构建查询参数
  const queryParams = new URLSearchParams();

  // 添加所有非空参数
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params.searchQuery) queryParams.append('searchQuery', params.searchQuery);
  if (params.tags) queryParams.append('tags', params.tags);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.userId) queryParams.append('userId', params.userId.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.onlyWithGps !== undefined) queryParams.append('onlyWithGps', params.onlyWithGps.toString());
  if (params.useVectorSearch !== undefined) queryParams.append('useVectorSearch', params.useVectorSearch.toString());
  if (params.similarityThreshold) queryParams.append('similarityThreshold', params.similarityThreshold.toString());
  if (params.excludeAlbumId) queryParams.append('excludeAlbumId', params.excludeAlbumId.toString());
  if (params.albumId) queryParams.append('albumId', params.albumId.toString());
  if (params.onlyFavorites !== undefined) queryParams.append('onlyFavorites', params.onlyFavorites.toString());
  if (params.ownerId !== undefined) queryParams.append('ownerId', params.ownerId.toString());
  if (params.includeAllPublic !== undefined) queryParams.append('includeAllPublic', params.includeAllPublic.toString());

  // 最终URL调试日志
  const url = `${BASE_URL}/picture/get_pictures?${queryParams.toString()}`;
  console.log("发送API请求:", url);
  
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    const data = await response.json();

    // 添加结果日志
    console.log("API 响应结果:", {
      success: data.success,
      totalCount: data.totalCount,
      resultsCount: data.data?.length || 0
    });

    return data as PaginatedResult<PictureResponse>;
  } catch (error) {
    console.error('获取图片列表失败:', error);
    return {
      success: false,
      message: '网络请求失败，请检查您的网络连接',
      data: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
      totalPages: 0,
      code: 500,
    };
  }
}

// 收藏图片
export async function favoritePicture(pictureId: number): Promise<BaseResult<boolean>> {
  return fetchApi<boolean>('/picture/favorite', {
    method: 'POST',
    body: JSON.stringify({ pictureId }),
  });
}

// 取消收藏图片
export async function unfavoritePicture(pictureId: number): Promise<BaseResult<boolean>> {
  return fetchApi<boolean>('/picture/unfavorite', {
    method: 'POST',
    body: JSON.stringify({ pictureId }),
  });
}

// 获取用户收藏的图片
export async function getUserFavorites(page: number = 1, pageSize: number = 8): Promise<PaginatedResult<PictureResponse>> {
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${BASE_URL}/picture/favorites?page=${page}&pageSize=${pageSize}`;
    const response = await fetch(url, { headers });
    const data = await response.json();

    return data as PaginatedResult<PictureResponse>;
  } catch (error) {
    console.error('获取收藏图片失败:', error);
    return {
      success: false,
      message: '网络请求失败，请检查您的网络连接',
      data: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
      totalPages: 0,
      code: 500,
    };
  }
}

// 上传图片
export async function uploadPicture(
  file: File,
  data: {
    permission?: number;
    albumId?: number;
    onProgress?: (percent: number) => void
  } = {}
): Promise<BaseResult<PictureResponse>> {
  const formData = new FormData();
  formData.append('file', file);

  if (data.permission !== undefined) {
    formData.append('permission', data.permission.toString());
  }

  if (data.albumId !== undefined) {
    formData.append('albumId', data.albumId.toString());
  }

  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const xhr = new XMLHttpRequest();

    // 返回一个Promise
    return new Promise((resolve, reject) => {
      xhr.open('POST', `${BASE_URL}/picture/upload_picture`);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && data.onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          data.onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } else {
          reject({
            status: xhr.status,
            message: xhr.statusText || '上传失败',
          });
        }
      };

      xhr.onerror = () => {
        reject({
          status: xhr.status,
          message: '网络错误，上传失败',
        });
      };

      xhr.send(formData);
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    return {
      success: false,
      message: '上传图片失败',
      code: 500,
    };
  }
}

// 删除多张图片
export async function deleteMultiplePictures(pictureIds: number[]): Promise<BaseResult<object>> {
  return fetchApi<object>('/picture/delete_pictures', {
    method: 'POST',
    body: JSON.stringify({ pictureIds }),
  });
}

