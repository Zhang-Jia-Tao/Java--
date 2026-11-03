package com.example.mini.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepo extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByFamily(String family);

    /** 原子标记已用：并发刷新时只有一个能成功（0 行 = 重放） */
    @Modifying
    @Transactional
    @Query("update RefreshToken t set t.usedAt = :now where t.tokenHash = :hash and t.usedAt is null")
    int markUsed(@Param("hash") String hash, @Param("now") Instant now);


    @Modifying
    @Transactional
    @Query("delete from RefreshToken t where t.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    @Modifying
    @Transactional
    @Query("delete from RefreshToken t where t.expiresAt < :before")
    void deleteExpired(@Param("before") Instant before);
}
