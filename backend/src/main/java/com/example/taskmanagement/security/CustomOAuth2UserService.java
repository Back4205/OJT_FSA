package com.example.taskmanagement.security;

import com.example.taskmanagement.model.Role;
import com.example.taskmanagement.model.User;
import com.example.taskmanagement.model.enums.AuthProvider;
import com.example.taskmanagement.model.enums.RoleName;
import com.example.taskmanagement.repository.RoleRepository;
import com.example.taskmanagement.repository.UserRepository;
import com.example.taskmanagement.security.CustomOAuth2User;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest)
            throws OAuth2AuthenticationException {

        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId =
                userRequest.getClientRegistration().getRegistrationId();

        Map<String, Object> attributes = oAuth2User.getAttributes();

        AuthProvider provider;
        String providerId;
        String email;
        String name;

        switch (registrationId) {

            case "google":

                provider = AuthProvider.GOOGLE;
                providerId = (String) attributes.get("sub");
                email = (String) attributes.get("email");
                name = (String) attributes.get("name");

                break;

            case "github":

                provider = AuthProvider.GITHUB;
                providerId = String.valueOf(attributes.get("id"));
                name = (String) attributes.get("login");

                email = (String) attributes.get("email");

                // Nếu GitHub không trả email thì gọi API /user/emails
                if (email == null || email.isBlank()) {
                    email = getGithubPrimaryEmail(userRequest);
                }

                break;

            default:
                throw new OAuth2AuthenticationException(
                        "Unsupported OAuth2 Provider: " + registrationId);
        }

        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException(
                    "Cannot retrieve email from " + registrationId
            );
        }

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {

            Role memberRole = roleRepository.findByName(RoleName.MEMBER)
                    .orElseThrow(() ->
                            new IllegalStateException("Role MEMBER not found."));

            user = new User();

            user.setEmail(email);
            user.setUsername(email);
            user.setPassword(null);

            user.setProvider(provider);
            user.setProviderId(providerId);

            user.setRole(memberRole);

            user.setActive(true);

            userRepository.save(user);

            return oAuth2User;
        }

        // Cho phép login dù khác provider; ghi nhận provider của lần login cuối
       user.setProvider(provider);
userRepository.save(user);


return new CustomOAuth2User(
        oAuth2User.getAuthorities(),
        oAuth2User.getAttributes(),
        "id",
        email
);
    }

    /**
     * Lấy email chính của GitHub nếu /user không trả email
     */
    private String getGithubPrimaryEmail(OAuth2UserRequest userRequest) {

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(userRequest.getAccessToken().getTokenValue());

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<List<Map<String, Object>>> response =
                restTemplate.exchange(
                        "https://api.github.com/user/emails",
                        HttpMethod.GET,
                        entity,
                        new ParameterizedTypeReference<>() {
                        });

        List<Map<String, Object>> emails = response.getBody();

        if (emails == null) {
            return null;
        }

        for (Map<String, Object> item : emails) {

            Boolean primary = (Boolean) item.get("primary");
            Boolean verified = (Boolean) item.get("verified");

            if (Boolean.TRUE.equals(primary) &&
                    Boolean.TRUE.equals(verified)) {

                return (String) item.get("email");
            }
        }

        return null;
    }
}