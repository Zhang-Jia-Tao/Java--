package com.example.mini.task;

import com.example.mini.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    public record TaskReq(@NotBlank(message = "标题不能为空") @Size(max = 120, message = "标题最多 120 字") String title) {
    }

    public record StatusReq(@NotBlank String status) {
    }

    public record TaskDto(Long id, String title, String status, String createdAt) {
        static TaskDto of(Task t) {
            return new TaskDto(t.getId(), t.getTitle(), t.getStatus(), t.getCreatedAt().toString());
        }
    }

    @GetMapping
    public ApiResponse<ApiResponse.PageRes<TaskDto>> page(@AuthenticationPrincipal Long uid,
                                                          @RequestParam(defaultValue = "1") int page,
                                                          @RequestParam(defaultValue = "10") int size,
                                                          @RequestParam(required = false) String kw) {
        Page<Task> result = service.page(uid, page, size, kw);
        List<TaskDto> list = result.getContent().stream().map(TaskDto::of).toList();
        return ApiResponse.ok(new ApiResponse.PageRes<>(list, result.getTotalElements(),
                result.getNumber() + 1, result.getSize()));
    }

    @PostMapping
    public ApiResponse<TaskDto> create(@AuthenticationPrincipal Long uid, @Valid @RequestBody TaskReq req) {
        return ApiResponse.ok(TaskDto.of(service.create(uid, req.title())));
    }

    @PutMapping("/{id}/status")
    public ApiResponse<TaskDto> updateStatus(@AuthenticationPrincipal Long uid,
                                             @PathVariable Long id,
                                             @Valid @RequestBody StatusReq req) {
        return ApiResponse.ok(TaskDto.of(service.updateStatus(uid, id, req.status())));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal Long uid, @PathVariable Long id) {
        service.delete(uid, id);
        return ApiResponse.ok();
    }
}
