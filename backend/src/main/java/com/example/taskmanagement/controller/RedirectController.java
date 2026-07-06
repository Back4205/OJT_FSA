package com.example.taskmanagement.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class RedirectController {

    // 1. Khi người dùng gõ link gốc ngrok (hoặc localhost:8080)
    @GetMapping("/")
    public String redirectToApp() {
        // Tự động bẻ lái trình duyệt sang có chữ taskmanager
        return "redirect:/taskmanager";
    }

    // 2. Khi trình duyệt bị bẻ lái sang /taskmanager
    @GetMapping("/taskmanager")
    public String serveApp() {
        // Trả về file giao diện index.html của React (nằm trong thư mục static)
        return "forward:/index.html";
    }
}