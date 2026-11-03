package com.example.mini.common;

import org.springframework.http.HttpStatus;

/** 业务异常：带业务码与 HTTP 状态，由 GlobalExceptionHandler 统一输出 */
public class BizException extends RuntimeException {

    private final int code;
    private final HttpStatus status;

    public BizException(int code, String message) {
        this(code, message, HttpStatus.BAD_REQUEST);
    }

    public BizException(int code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public int getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
