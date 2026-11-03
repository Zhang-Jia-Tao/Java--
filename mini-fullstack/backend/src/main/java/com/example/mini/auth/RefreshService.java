package com.example.mini.auth;

import com.example.mini.common.BizException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

/**
 * refresh token 的签发、轮换与吊销。
 *
 * 关键设计：
 * 1) 库里只存 SHA-256，泄露数据库也换不出可用 token；
 * 2) 轮换：换票即把旧 token 标记 usedAt；
 * 3) 重放检测：同一 token 第二次出现（markUsed 影响 0 行），整条 family 全部吊销；
 * 4) markUsed 是单条 update，多个实例并发刷新时只有一个能成功 —— 不依赖单机锁。
 */
@Service
public class RefreshService {

    private final RefreshTokenRepo repo;
    private final RefreshRevoker revoker;
    private final Duration ttl;
    private final SecureRandom random = new SecureRandom();

    public RefreshService(RefreshTokenRepo repo, RefreshRevoker revoker, @Value("${jwt.refresh-ttl}") Duration ttl) {
        this.repo = repo;
        this.revoker = revoker;
        this.ttl = ttl;
    }

    public record Issued(String token, Long userId) {
    }

    @Transactional
    public Issued issue(Long userId) {
        return issue(userId, UUID.randomUUID().toString());
    }

    private Issued issue(Long userId, String family) {
        byte[] buf = new byte[32];
        random.nextBytes(buf);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
        RefreshToken t = new RefreshToken();
        t.setTokenHash(sha256(raw));
        t.setUserId(userId);
        t.setFamily(family);
        t.setCreatedAt(Instant.now());
        t.setExpiresAt(Instant.now().plus(ttl));
        repo.save(t);
        return new Issued(raw, userId);
    }

    /** 换票：成功返回新 refresh 与 userId；失败抛 401 系业务异常 */
    @Transactional
    public Issued rotate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BizException(40100, "缺少 refresh token", HttpStatus.UNAUTHORIZED);
        }
        String hash = sha256(rawToken);
        RefreshToken t = repo.findByTokenHash(hash)
                .orElseThrow(() -> new BizException(40100, "refresh 无效，请重新登录", HttpStatus.UNAUTHORIZED));

        if (t.getUsedAt() != null) {
            // 重放：可能是 token 泄露，整条会话链作废
            revokeFamily(t.getFamily());
            throw new BizException(40101, "该会话已失效，请重新登录", HttpStatus.UNAUTHORIZED);
        }
        if (t.getExpiresAt().isBefore(Instant.now())) {
            throw new BizException(40102, "登录已过期，请重新登录", HttpStatus.UNAUTHORIZED);
        }
        // 原子标记：并发下只有一次能拿到 1 行
        if (repo.markUsed(hash, Instant.now()) != 1) {
            revokeFamily(t.getFamily());
            throw new BizException(40101, "该会话已失效，请重新登录", HttpStatus.UNAUTHORIZED);
        }
        return issue(t.getUserId(), t.getFamily());
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        repo.findByTokenHash(sha256(rawToken)).ifPresent(t -> revokeFamily(t.getFamily()));
    }

    private void revokeFamily(String family) {
        // 独立事务：本方法随后要抛异常，就地 delete 会被回滚掉
        revoker.revokeFamily(family);
    }

    public static String sha256(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
