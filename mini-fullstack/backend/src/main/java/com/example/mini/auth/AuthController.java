package com.example.mini.auth;

import com.example.mini.common.ApiResponse;
import com.example.mini.common.BizException;
import com.example.mini.user.AppUser;
import com.example.mini.user.AppUserRepo;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * 登录 / 换票 / 登出。
 * access 放在响应体（前端只存内存），refresh 放在 httpOnly + SameSite=Lax + path 限定的 Cookie。
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AppUserRepo users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final RefreshService refresh;

    private final String cookieName;
    private final String cookiePath;
    private final boolean cookieSecure;
    private final Duration refreshTtl;

    public AuthController(AppUserRepo users,
                          PasswordEncoder encoder,
                          JwtService jwt,
                          RefreshService refresh,
                          @Value("${cookie.name:rt}") String cookieName,
                          @Value("${cookie.path:/api/auth}") String cookiePath,
                          @Value("${cookie.secure:false}") boolean cookieSecure,
                          @Value("${jwt.refresh-ttl}") Duration refreshTtl) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.refresh = refresh;
        this.cookieName = cookieName;
        this.cookiePath = cookiePath;
        this.cookieSecure = cookieSecure;
        this.refreshTtl = refreshTtl;
    }

    public record LoginReq(@NotBlank String username, @NotBlank String password) {
    }

    public record TokenRes(String accessToken, String name, long expiresIn) {
    }

    @PostMapping("/login")
    public ApiResponse<TokenRes> login(@Valid @RequestBody LoginReq req, HttpServletResponse res) {
        AppUser user = users.findByUsername(req.username())
                // 用户不存在也走一次 matches，避免用响应时间嗅探账号是否存在
                .orElse(null);
        String encoded = user != null ? user.getPassword() : "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
        boolean ok = encoder.matches(req.password(), encoded);
        if (user == null || !ok) {
            throw new BizException(40103, "账号或密码错误", HttpStatus.UNAUTHORIZED);
        }

        String access = jwt.issue(user.getId(), user.getRole());
        RefreshService.Issued rt = refresh.issue(user.getId());
        writeCookie(res, rt.token(), refreshTtl);
        return ApiResponse.ok(new TokenRes(access, user.getUsername(), jwt.accessTtl().toSeconds()));
    }

    @PostMapping("/refresh")
    public ApiResponse<TokenRes> refresh(HttpServletRequest req,
                                         HttpServletResponse res) {
        String raw = readCookie(req);
        RefreshService.Issued rt = refresh.rotate(raw);
        AppUser user = users.findById(rt.userId())
                .orElseThrow(() -> new BizException(40100, "账号不存在", HttpStatus.UNAUTHORIZED));
        String access = jwt.issue(user.getId(), user.getRole());
        writeCookie(res, rt.token(), refreshTtl);
        return ApiResponse.ok(new TokenRes(access, user.getUsername(), jwt.accessTtl().toSeconds()));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest req, HttpServletResponse res) {
        refresh.revoke(readCookie(req));
        writeCookie(res, "", Duration.ZERO);
        return ApiResponse.ok();
    }

    /** 仅供前端读取过期秒数用，避免前端硬编码 */
    @PostMapping("/whoami")
    public ApiResponse<String> whoami(@AuthenticationPrincipal Long uid) {
        return ApiResponse.ok(String.valueOf(uid));
    }

    private String readCookie(HttpServletRequest req) {
        Cookie[] cookies = req.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie c : cookies) {
            if (cookieName.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }
    private void writeCookie(HttpServletResponse res, String value, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(cookieName, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path(cookiePath)
                .maxAge(maxAge)
                .build();
        res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
