package com.example.taskmanagement.exception;

public class OtpRequiredException extends RuntimeException {
    public OtpRequiredException(String message) {
        super(message);
    }
}
