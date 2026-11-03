package com.example.mini.task;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TaskRepo extends JpaRepository<Task, Long> {

    Page<Task> findByOwnerId(Long ownerId, Pageable pageable);

    Page<Task> findByOwnerIdAndTitleContainingIgnoreCase(Long ownerId, String title, Pageable pageable);

    Optional<Task> findByIdAndOwnerId(Long id, Long ownerId);
}
