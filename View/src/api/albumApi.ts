import type { 
  PaginatedResult, 
  AlbumResponse, 
  CreateAlbumRequest, 
  UpdateAlbumRequest, 
  AlbumPictureRequest,
  AlbumPicturesRequest,
  BaseResult 
} from './types';
import { fetchApi, BASE_URL } from './fetchClient';

// 获取相册列表
export async function getAlbums(
  page: number = 1, 
  pageSize: number = 10,
  userId?: number
): Promise<PaginatedResult<AlbumResponse>> {
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('pageSize', pageSize.toString());
    if (userId) {
      queryParams.append('userId', userId.toString());
    }

    const url = `${BASE_URL}/album/get_albums?${queryParams.toString()}`;
    const response = await fetch(url, { headers });
    const data = await response.json();

    return data as PaginatedResult<AlbumResponse>;
  } catch (error) {
    console.error('获取相册列表失败:', error);
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

// 获取单个相册详情
export async function getAlbumById(id: number): Promise<BaseResult<AlbumResponse>> {
  return fetchApi<AlbumResponse>(`/album/get_album/${id}`);
}

// 创建相册
export async function createAlbum(data: CreateAlbumRequest): Promise<BaseResult<AlbumResponse>> {
  return fetchApi<AlbumResponse>('/album/create_album', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 更新相册
export async function updateAlbum(data: UpdateAlbumRequest): Promise<BaseResult<AlbumResponse>> {
  return fetchApi<AlbumResponse>('/album/update_album', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 删除相册
export async function deleteAlbum(id: number): Promise<BaseResult<boolean>> {
  return fetchApi<boolean>('/album/delete_album', {
    method: 'POST',
    body: JSON.stringify(id),
  });
}

// 添加多张图片到相册
export async function addPicturesToAlbum(albumId: number, pictureIds: number[]): Promise<BaseResult<boolean>> {
  const data: AlbumPicturesRequest = {
    albumId,
    pictureIds,
  };
  return fetchApi<boolean>('/album/add_pictures', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 添加图片到相册
export async function addPictureToAlbum(albumId: number, pictureId: number): Promise<BaseResult<boolean>> {
  const data: AlbumPictureRequest = {
    albumId,
    pictureId,
  };
  return fetchApi<boolean>('/album/add_picture', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 从相册移除图片
export async function removePictureFromAlbum(albumId: number, pictureId: number): Promise<BaseResult<boolean>> {
  const data: AlbumPictureRequest = {
    albumId,
    pictureId,
  };
  return fetchApi<boolean>('/album/remove_picture', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
