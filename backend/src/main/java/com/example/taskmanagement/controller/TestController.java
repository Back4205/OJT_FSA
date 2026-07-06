package com.example.taskmanagement.controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;


@RestController
public class TestController {
    @GetMapping("/api/test")
    public String TestControllerBackend() {
        return "test controller backend";
    }
    
    
}
