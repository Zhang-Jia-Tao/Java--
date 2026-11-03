package com.example.mini.common;

import java.util.List;

/**
 * 统一响应体：HTTP 状态码表达传输/鉴权层，code 表达业务层。
 * code=0 表示成功；失败码约定见 README。
 */
public record ApiResponse<T>(int code, String msg, T data) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(0, "ok", data);
    }

    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(0, "ok", null);
    }

    public static <T> ApiResponse<T> fail(int code, String msg) {
        return new ApiResponse<>(code, msg, null);
    }

    /** 分页统一结构，前端分页器只认 list/total/page/size */
    public record PageRes<T>(List<T> list, long total, int page, int size) {
    }
}
