package com.example.mini.common;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.UUID;

/** 异常统一出口：前端永远收到同一种结构，500 带 traceId 便于查日志 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BizException.class)
    public ResponseEntity<ApiResponse<Void>> onBiz(BizException e) {
        return ResponseEntity.status(e.getStatus())
                .body(ApiResponse.fail(e.getCode(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> onInvalid(MethodArgumentNotValidException e, HttpServletRequest req) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " " + f.getDefaultMessage())
                .findFirst()
                .orElse("参数不合法");
        log.info("bad request {} {}", req.getMethod(), req.getRequestURI());
        return ResponseEntity.badRequest().body(ApiResponse.fail(40000, msg));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> onTooLarge(MaxUploadSizeExceededException e) {
        return ResponseEntity.badRequest().body(ApiResponse.fail(40013, "文件超过 5MB"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> onOther(Exception e, HttpServletRequest req) {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        log.error("unhandled error traceId={} {} {}", traceId, req.getMethod(), req.getRequestURI(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.fail(50000, "服务异常，请稍后重试（" + traceId + "）"));
    }
}
