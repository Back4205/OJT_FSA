// package com.example.taskmanagement.controller;

// import org.springframework.stereotype.Controller;
// import org.springframework.web.bind.annotation.GetMapping;

// @Controller
// public class RedirectController {

//     // 1. Khi người dùng gõ link gốc ngrok (hoặc localhost:8080)
//     @GetMapping("/")
//     public String redirectToApp() {
//         // Tự động bẻ lái trình duyệt sang có chữ taskmanager
//         return "redirect:/taskmanager";
//     }

//     // 2. Khi trình duyệt bị bẻ lái sang /taskmanager
// @GetMapping({"/taskmanager", "/taskmanager/**"})
//     public String serveApp() {
//         // Trả về file giao diện index.html của React (nằm trong thư mục static)
//         return "forward:/index.html";
//     }
// }

// // file này chỉ cần khi cần redirect từ / sang /taskmanager, còn lại để React handle routing. và cần khi deploy lên server,
//  vì server sẽ không biết /taskmanager là gì, nên cần bẻ lái sang index.html để React handle routing.
// Khi chạy local thì không cần file này, vì Spring Boot sẽ tự động bẻ lái sang index.html khi không tìm thấy route nào phù hợp.