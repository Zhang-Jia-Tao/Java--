package com.example.mini.config;

import com.example.mini.task.Task;
import com.example.mini.task.TaskRepo;
import com.example.mini.user.AppUser;
import com.example.mini.user.AppUserRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** 首次启动塞一个演示账号与若干任务，保证 clone 下来就能点开看效果 */
@Configuration
public class SeedData {

    private static final Logger log = LoggerFactory.getLogger(SeedData.class);

    @Bean
    CommandLineRunner seed(AppUserRepo users,
                            TaskRepo tasks,
                            PasswordEncoder encoder,
                            @Value("${seed.user:demo}") String username,
                            @Value("${seed.pass:123456}") String password,
                            @Value("${seed.task-count:30}") int taskCount) {
        return args -> {
            AppUser user = users.findByUsername(username).orElseGet(() -> {
                AppUser u = new AppUser();
                u.setUsername(username);
                u.setPassword(encoder.encode(password));
                u.setRole("USER");
                log.info("创建演示账号 {} / {}", username, password);
                return users.save(u);
            });

            if (tasks.count() > 0) {
                return;
            }
            List<Task> batch = new ArrayList<>();
            String[] statuses = {"TODO", "DOING", "DONE"};
            for (int i = 1; i <= taskCount; i++) {
                Task t = new Task();
                t.setOwnerId(user.getId());
                t.setTitle("示例任务 " + i + "：整理第 " + i + " 章的面试要点");
                t.setStatus(statuses[i % statuses.length]);
                t.setCreatedAt(Instant.now().minusSeconds(60L * 60 * 24 * (taskCount - i)));
                batch.add(t);
            }
            tasks.saveAll(batch);
            log.info("初始化 {} 条示例任务", batch.size());
        };
    }
}
