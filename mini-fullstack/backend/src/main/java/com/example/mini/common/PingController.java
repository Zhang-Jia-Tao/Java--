package com.example.mini.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/** 健康检查：start.ps1 / start.sh 靠它判断后端是否就绪 */
@RestController
public class PingController {

    @GetMapping("/api/ping")
    public ApiResponse<Map<String, Object>> ping() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "up");
        body.put("ts", Instant.now().toString());
        return ApiResponse.ok(body);
    }
}
