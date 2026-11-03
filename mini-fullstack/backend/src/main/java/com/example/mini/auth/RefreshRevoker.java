package com.example.mini.auth;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 单独负责「吊销整条 family」。
 *
 * 为什么要独立一个 bean：重放检测是在 rotate() 的事务里抛异常的，
 * 如果就地 delete，异常会让整个事务回滚 —— 吊销动作跟着一起消失，攻击者仍然能用旧 token。
 * REQUIRES_NEW 让它跑在独立事务里，抛异常也照样提交。
 */
@Component
public class RefreshRevoker {

    private final RefreshTokenRepo repo;

    public RefreshRevoker(RefreshTokenRepo repo) {
        this.repo = repo;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeFamily(String family) {
        repo.deleteAll(repo.findByFamily(family));
    }
}
