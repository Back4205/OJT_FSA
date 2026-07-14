package com.example.taskmanagement.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public EmailService(org.springframework.beans.factory.ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSender = mailSenderProvider.getIfAvailable();
    }

    @Async
    public void sendEmail(String to, String subject, String content) {
        if (mailSender == null || fromEmail == null || fromEmail.isBlank()) {
            log.warn("=== SMTP Mail Config is missing ===");
            log.warn("To: {}", to);
            log.warn("Subject: {}", subject);
            log.warn("Content:\n{}", content);
            log.warn("==================================");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(content, true);

            mailSender.send(message);
            log.info("Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}", to, e);
            // Fallback dump in log so the developer can still copy/paste the link
            log.warn("=== FALLBACK LOG ===");
            log.warn("To: {}", to);
            log.warn("Subject: {}", subject);
            log.warn("Content:\n{}", content);
            log.warn("====================");
        }
    }

    @Async
    public void sendVerificationEmail(String email, String username, String verifyUrl) {
        String subject = "Verify your TaskManagement account";
        String content = "<h3>Hello " + username + ",</h3>"
                + "<p>Thank you for registering. Please click the link below to verify your account:</p>"
                + "<p><a href=\"" + verifyUrl + "\">Verify Account</a></p>"
                + "<p>Or copy and paste this URL into your browser:</p>"
                + "<p><code>" + verifyUrl + "</code></p>"
                + "<br/>"
                + "<p>Best regards,<br/>FSA TaskManagement Team</p>";

        sendEmail(email, subject, content);
    }

    @Async
    public void sendPasswordResetEmail(String email, String resetUrl) {
        String subject = "Reset your TaskManagement password";
        String content = "<h3>Hello,</h3>"
                + "<p>You requested to reset your password. Please click the link below to verify your request:</p>"
                + "<p><a href=\"" + resetUrl + "\">Reset Password</a></p>"
                + "<p>Or copy and paste this URL into your browser:</p>"
                + "<p><code>" + resetUrl + "</code></p>"
                + "<p>This link will expire in 24 hours.</p>"
                + "<br/>"
                + "<p>Best regards,<br/>FSA TaskManagement Team</p>";

        sendEmail(email, subject, content);
    }

    @Async
    public void sendOtpEmail(String email, String otpCode) {
        String subject = "Your TaskManagement OTP Login Code";
        String content = "<h3>Hello,</h3>"
                + "<p>You requested to log in. Please use the following 6-digit OTP code to verify your identity:</p>"
                + "<p style=\"font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #4F46E5;\">" + otpCode + "</p>"
                + "<p>This code will expire in 5 minutes.</p>"
                + "<br/>"
                + "<p>Best regards,<br/>FSA TaskManagement Team</p>";

        sendEmail(email, subject, content);
    }
}
