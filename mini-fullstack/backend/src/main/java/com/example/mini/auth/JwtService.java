package com.example.mini.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

/** 签发与校验 access token：算法、过期、密钥只在这一个文件里 */
@Service
public class JwtService {

    private final SecretKey key;
    private final Duration accessTtl;

    public JwtService(@Value("${jwt.secret}") String secret,
                      @Value("${jwt.access-ttl}") Duration accessTtl) {
        // HS256 要求密钥至少 32 字节，否则 jjwt 会抛 WeakKeyException
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTtl = accessTtl;
    }

    public String issue(long userId, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTtl)))
                .signWith(key)
                .compact();
    }

    public Jws<Claims> parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
    }

    public Duration accessTtl() {
        return accessTtl;
    }
}
