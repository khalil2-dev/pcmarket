package com.pcmarket.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.pcmarket.common.Vals;
import com.pcmarket.security.JwtUtil;

/** POST /login.php and POST /register.php - form-data (Angular) or JSON (Postman). */
@RestController
public class AuthController {

    private final JdbcTemplate jdbc;
    private final JwtUtil jwt;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthController(JdbcTemplate jdbc, JwtUtil jwt) {
        this.jdbc = jdbc;
        this.jwt = jwt;
    }

    // ------------------------------------------------------------------ LOGIN

    @PostMapping(value = "/login.php",
            consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_FORM_URLENCODED_VALUE})
    public Map<String, Object> loginForm(@RequestParam(name = "email", required = false) String email,
                                         @RequestParam(name = "motDePasse", required = false) String motDePasse) {
        return doLogin(email, motDePasse);
    }

    @PostMapping(value = "/login.php", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> loginJson(@RequestBody Map<String, Object> body) {
        return doLogin(Vals.str(body.get("email")), Vals.str(body.get("motDePasse")));
    }

    private Map<String, Object> doLogin(String email, String motDePasse) {
        if (email == null || email.isBlank() || motDePasse == null || motDePasse.isEmpty()) {
            return Vals.status("error", "Missing data");
        }
        List<Map<String, Object>> users = jdbc.queryForList(
                "SELECT idUser, email, motDePasse, role FROM utilisateur WHERE email = ?", email.trim());
        if (users.isEmpty()) return Vals.status("error", "User not found");

        Map<String, Object> u = users.get(0);
        String hash = (String) u.get("motDePasse");
        if (hash == null || !encoder.matches(motDePasse, hash)) {
            return Vals.status("error", "Wrong password");
        }

        Object r = u.get("role");
        String role = r == null ? "user" : r.toString();
        String token = jwt.generate(((Number) u.get("idUser")).intValue(), (String) u.get("email"), role);

        Map<String, Object> res = Vals.status("success", null);
        res.remove("message");
        res.put("token", token);
        return res;
    }

    // --------------------------------------------------------------- REGISTER

    @PostMapping(value = "/register.php",
            consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_FORM_URLENCODED_VALUE})
    public Map<String, Object> registerForm(@RequestParam(name = "nom", required = false) String nom,
                                            @RequestParam(name = "prenom", required = false) String prenom,
                                            @RequestParam(name = "email", required = false) String email,
                                            @RequestParam(name = "motDePasse", required = false) String motDePasse) {
        return doRegister(nom, prenom, email, motDePasse);
    }

    @PostMapping(value = "/register.php", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> registerJson(@RequestBody Map<String, Object> b) {
        return doRegister(Vals.str(b.get("nom")), Vals.str(b.get("prenom")),
                Vals.str(b.get("email")), Vals.str(b.get("motDePasse")));
    }

    private Map<String, Object> doRegister(String nom, String prenom, String email, String motDePasse) {
        if (isBlank(nom) || isBlank(prenom) || isBlank(email) || isBlank(motDePasse)) {
            return Vals.status("error", "Missing data");
        }
        Integer exists = jdbc.queryForObject(
                "SELECT COUNT(*) FROM utilisateur WHERE email = ?", Integer.class, email.trim());
        if (exists != null && exists > 0) return Vals.status("error", "Email already exists");

        int rows = jdbc.update(
                "INSERT INTO utilisateur (nom, prenom, email, motDePasse) VALUES (?, ?, ?, ?)",
                nom.trim(), prenom.trim(), email.trim(), encoder.encode(motDePasse));
        return rows == 1 ? Vals.status("success", "Registered") : Vals.status("error", "Register failed");
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
