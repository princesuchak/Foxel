using Microsoft.AspNetCore.Mvc;
using Foxel.Models;
using System.Security.Claims;

namespace Foxel.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public abstract class BaseApiController : ControllerBase
    {
        protected int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return userIdClaim != null ? int.Parse(userIdClaim) : null;
        }

        protected ActionResult<BaseResult<T>> Success<T>(T data, string message = "操作成功", int statusCode = 200)
        {
            return Ok(new BaseResult<T>
            {
                Success = true,
                Message = message,
                Data = data,
                StatusCode = statusCode
            });
        }

        protected ActionResult<BaseResult<T>> Success<T>(string message = "操作成功", int statusCode = 200)
        {
            return Ok(new BaseResult<T>
            {
                Success = true,
                Message = message,
                StatusCode = statusCode
            });
        }

        protected ActionResult<BaseResult<T>> Error<T>(string message, int statusCode = 400)
        {
            return StatusCode(statusCode, new BaseResult<T>
            {
                Success = false,
                Message = message,
                StatusCode = statusCode
            });
        }

        protected ActionResult<PaginatedResult<T>> PaginatedSuccess<T>(
            List<T>? data,
            int totalCount,
            int page,
            int pageSize,
            string message = "获取成功")
        {
            return Ok(new PaginatedResult<T>
            {
                Success = true,
                Message = message,
                Data = data,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                StatusCode = 200
            });
        }

        protected ActionResult<PaginatedResult<T>> PaginatedError<T>(string message, int statusCode = 400)
        {
            return StatusCode(statusCode, new PaginatedResult<T>
            {
                Success = false,
                Message = message,
                Data = new List<T>(),
                TotalCount = 0,
                Page = 0,
                PageSize = 0,
                StatusCode = statusCode
            });
        }
    }
}