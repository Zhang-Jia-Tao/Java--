package com.example.mini.file;

import com.example.mini.common.ApiResponse;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final StorageService storage;

    public FileController(StorageService storage) {
        this.storage = storage;
    }

    public record UploadRes(String url, long size) {
    }

    /** 上传需要登录 */
    @PostMapping
    public ApiResponse<UploadRes> upload(@AuthenticationPrincipal Long uid,
                                         @RequestParam("file") MultipartFile file) {
        StorageService.Stored stored = storage.save(file);
        return ApiResponse.ok(new UploadRes("/api/files/" + stored.name(), stored.size()));
    }

    /** 读取放开：图片要能直接被 <img src> 加载（这里没做签名 URL，生产应改用预签名） */
    @GetMapping("/{name}")
    public ResponseEntity<Resource> get(@PathVariable String name) {
        Resource res = storage.load(name);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(storage.contentTypeOf(name)))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic())
                .header("X-Content-Type-Options", "nosniff")
                .body(res);
    }
}
