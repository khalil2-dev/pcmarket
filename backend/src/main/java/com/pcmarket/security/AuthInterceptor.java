package com.pcmarket.security;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Checks the "Authorization: Bearer <jwt>" header on every protected route and exposes
 * the authenticated user as request attributes "userId" and "role".
 * /admin/** additionally requires role = admin.
 */
public class AuthInterceptor implements HandlerInterceptor {

    private final JwtUtil jwt;

    public AuthInterceptor(JwtUtil jwt) {
        this.jwt = jwt;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true; // CORS preflight

        String header = request.getHeader("Authorization");
        if (header == null || header.isBlank()) {
            return deny(response, HttpStatus.UNAUTHORIZED, "No token");
        }

        Map<String, Object> claims = jwt.verify(header.replace("Bearer ", "").trim());
        if (claims == null) {
            return deny(response, HttpStatus.UNAUTHORIZED, "Invalid token");
        }

        int userId = ((Number) claims.get("idUser")).intValue();
        Object r = claims.get("role");
        String role = r == null ? "user" : r.toString();

        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (path.startsWith("/admin/") && !"admin".equals(role)) {
            return deny(response, HttpStatus.FORBIDDEN, "Admin only");
        }

        request.setAttribute("userId", userId);
        request.setAttribute("role", role);
        return true;
    }

    private boolean deny(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"success\":false,\"message\":\"" + message + "\"}");
        return false;
    }
}
