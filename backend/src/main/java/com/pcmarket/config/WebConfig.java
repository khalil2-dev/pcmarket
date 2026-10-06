package com.pcmarket.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.pcmarket.security.AuthInterceptor;
import com.pcmarket.security.JwtUtil;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final JwtUtil jwt;
    private final String uploadDir;

    public WebConfig(JwtUtil jwt, @Value("${app.upload-dir}") String uploadDir) {
        this.jwt = jwt;
        this.uploadDir = uploadDir;
    }

    /** Angular runs on http://localhost:4200, the API on http://localhost/backend */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor(jwt))
                .addPathPatterns("/**")
                .excludePathPatterns("/login.php", "/register.php", "/images/**", "/error");
    }

    /** Serves uploaded files at /backend/images/<filename> (URL used by the Angular pages). */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String location = dir.toUri().toString();
            if (!location.endsWith("/")) location += "/";
            registry.addResourceHandler("/images/**").addResourceLocations(location);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create upload dir " + uploadDir, e);
        }
    }
}
