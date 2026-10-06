package com.pcmarket.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/** HS256 JWT, same format as backend/jwt.php (payload: idUser, email, role, iat, exp). */
@Component
public class JwtUtil {

    private static final String HEADER = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
    private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DEC = Base64.getUrlDecoder();

    private final byte[] secret;
    private final long expirationSeconds;
    private final ObjectMapper mapper = new ObjectMapper();

    public JwtUtil(@Value("${app.jwt-secret}") String secret,
                   @Value("${app.jwt-expiration-seconds}") long expirationSeconds) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.expirationSeconds = expirationSeconds;
    }

    public String generate(int idUser, String email, String role) {
        try {
            long now = System.currentTimeMillis() / 1000;
            String header = ENC.encodeToString(HEADER.getBytes(StandardCharsets.UTF_8));
            String payload = null;

            // login.ts decodes the payload with a plain atob(), which cannot read '-' and '_'.
            // A tiny filler claim "n" is varied until the base64url payload contains neither,
            // so the (unchanged) Angular code always works.
            for (int n = 0; n < 200; n++) {
                Map<String, Object> claims = new LinkedHashMap<>();
                claims.put("idUser", idUser);
                claims.put("email", email);
                claims.put("role", role);
                claims.put("iat", now);
                claims.put("exp", now + expirationSeconds);
                claims.put("n", n);
                String p = ENC.encodeToString(mapper.writeValueAsBytes(claims));
                payload = p;
                if (p.indexOf('-') < 0 && p.indexOf('_') < 0) break;
            }
            return header + "." + payload + "." + sign(header + "." + payload);
        } catch (Exception e) {
            throw new IllegalStateException("JWT generation failed", e);
        }
    }

    /** Returns the claims, or null when the token is invalid or expired. */
    public Map<String, Object> verify(String token) {
        try {
            if (token == null) return null;
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;

            byte[] expected = sign(parts[0] + "." + parts[1]).getBytes(StandardCharsets.UTF_8);
            byte[] given = parts[2].getBytes(StandardCharsets.UTF_8);
            if (!MessageDigest.isEqual(expected, given)) return null;

            Map<String, Object> claims = mapper.readValue(DEC.decode(parts[1]),
                    new TypeReference<Map<String, Object>>() {});
            Object exp = claims.get("exp");
            if (!(exp instanceof Number) || ((Number) exp).longValue() < System.currentTimeMillis() / 1000) {
                return null;
            }
            if (!(claims.get("idUser") instanceof Number)) return null;
            return claims;
        } catch (Exception e) {
            return null;
        }
    }

    private String sign(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret, "HmacSHA256"));
        return ENC.encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }
}
