package com.example.mini.task;

import com.example.mini.common.BizException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;

@Service
public class TaskService {

    private static final Set<String> STATUSES = Set.of("TODO", "DOING", "DONE");
    private static final int MAX_PAGE_SIZE = 100;

    private final TaskRepo repo;

    public TaskService(TaskRepo repo) {
        this.repo = repo;
    }

    /** page 从 1 开始（对外语义直观），内部转成 Spring 的 0 基 */
    public Page<Task> page(Long ownerId, int page, int size, String keyword) {
        int p = Math.max(page, 1);
        int s = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        // 按时间倒序 + id 倒序：同一秒创建的多条也有稳定顺序，翻页不会跳条目
        Pageable pageable = PageRequest.of(p - 1, s,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        if (keyword == null || keyword.isBlank()) {
            return repo.findByOwnerId(ownerId, pageable);
        }
        return repo.findByOwnerIdAndTitleContainingIgnoreCase(ownerId, keyword.trim(), pageable);
    }

    @Transactional
    public Task create(Long ownerId, String title) {
        Task t = new Task();
        t.setOwnerId(ownerId);
        t.setTitle(title.trim());
        t.setStatus("TODO");
        t.setCreatedAt(Instant.now());
        return repo.save(t);
    }

    @Transactional
    public Task updateStatus(Long ownerId, Long id, String status) {
        if (!STATUSES.contains(status)) {
            throw new BizException(40001, "status 只能是 TODO / DOING / DONE");
        }
        Task t = repo.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new BizException(40400, "任务不存在", HttpStatus.NOT_FOUND));
        t.setStatus(status);
        return t;
    }

    @Transactional
    public void delete(Long ownerId, Long id) {
        Task t = repo.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new BizException(40400, "任务不存在", HttpStatus.NOT_FOUND));
        repo.delete(t);
    }
}
