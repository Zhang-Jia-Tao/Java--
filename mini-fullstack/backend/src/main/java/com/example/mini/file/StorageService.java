package com.example.mini.file;

import com.example.mini.common.BizException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * 上传落盘。四道校验都在这里：
 * 1) 大小；2) 扩展名白名单；3) 文件头魔数（扩展名可以伪造）；4) 读取时再做一次文件名收敛（防路径穿越）。
 * 生产环境应换成对象存储 + 预签名 URL，本类只用于单机演示。
 */
@Service
public class StorageService {

    private static final Set<String> ALLOWED_EXT = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private static final Pattern SAFE_NAME = Pattern.compile("^[A-Za-z0-9._-]{1,120}$");
    private static final Map<String, String> CONTENT_TYPE = Map.of(
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png",
            "webp", "image/webp",
            "gif", "image/gif");

    private final Path root;
    private final long maxBytes;

    public StorageService(@Value("${upload.dir:./uploads}") String dir,
                          @Value("${upload.max-bytes:5242880}") long maxBytes) throws IOException {
        this.root = Paths.get(dir).toAbsolutePath().normalize();
        this.maxBytes = maxBytes;
        Files.createDirectories(this.root);
    }

    public record Stored(String name, long size) {
    }

    public Stored save(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BizException(40010, "文件为空");
        }
        if (file.getSize() > maxBytes) {
            throw new BizException(40011, "文件超过 " + (maxBytes / 1024 / 1024) + "MB");
        }

        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = extensionOf(original);
        if (!ALLOWED_EXT.contains(ext)) {
            throw new BizException(40011, "只支持 jpg / jpeg / png / webp / gif");
        }

        byte[] head = readHead(file, 12);
        if (!magicMatches(ext, head)) {
            // 改了扩展名的 exe 在这里被拦下
            throw new BizException(40012, "文件内容与扩展名不符");
        }

        String name = UUID.randomUUID().toString().replace("-", "") + "." + ext;
        Path target = root.resolve(name).normalize();
        if (!target.startsWith(root)) {
            throw new BizException(40012, "非法文件名");
        }
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BizException(50011, "保存文件失败");
        }
        return new Stored(name, file.getSize());
    }

    public Resource load(String name) {
        if (name == null || !SAFE_NAME.matcher(name).matches()) {
            throw new BizException(40012, "非法文件名");
        }
        Path target = root.resolve(name).normalize();
        if (!target.startsWith(root)) {
            // ../../../etc/passwd 这类请求到此为止
            throw new BizException(40012, "非法文件名");
        }
        try {
            Resource res = new UrlResource(target.toUri());
            if (!res.exists() || !res.isReadable()) {
                throw new BizException(40400, "文件不存在");
            }
            return res;
        } catch (IOException e) {
            throw new BizException(40400, "文件不存在");
        }
    }

    public String contentTypeOf(String name) {
        return CONTENT_TYPE.getOrDefault(extensionOf(name), "application/octet-stream");
    }

    private static String extensionOf(String filename) {
        int i = filename.lastIndexOf('.');
        if (i < 0 || i == filename.length() - 1) {
            return "";
        }
        return filename.substring(i + 1).toLowerCase(Locale.ROOT);
    }

    private static byte[] readHead(MultipartFile file, int len) {
        try (InputStream in = file.getInputStream()) {
            return in.readNBytes(len);
        } catch (IOException e) {
            throw new BizException(50012, "读取文件失败");
        }
    }

    private static boolean magicMatches(String ext, byte[] h) {
        if (h.length < 4) {
            return false;
        }
        return switch (ext) {
            case "jpg", "jpeg" -> (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF;
            case "png" -> (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G';
            case "gif" -> h[0] == 'G' && h[1] == 'I' && h[2] == 'F';
            case "webp" -> h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                    && h.length >= 12 && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P';
            default -> false;
        };
    }
}
