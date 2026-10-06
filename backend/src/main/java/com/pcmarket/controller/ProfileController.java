package com.pcmarket.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.pcmarket.common.ApiException;
import com.pcmarket.common.Vals;
import com.pcmarket.service.AnnonceService;

/** /profile.php : GET (read), PUT (update), DELETE (delete my account). */
@RestController
public class ProfileController {

    private final JdbcTemplate jdbc;
    private final AnnonceService annonces;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public ProfileController(JdbcTemplate jdbc, AnnonceService annonces) {
        this.jdbc = jdbc;
        this.annonces = annonces;
    }

    @GetMapping("/profile.php")
    public Map<String, Object> get(@RequestAttribute("userId") int userId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT idUser, nom, prenom, email, role FROM utilisateur WHERE idUser = ?", userId);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Utilisateur introuvable");
        return new LinkedHashMap<>(rows.get(0));
    }

    @PutMapping("/profile.php")
    public Map<String, Object> update(@RequestAttribute("userId") int userId,
                                      @RequestBody Map<String, Object> body) {
        String nom = Vals.str(body.get("nom"));
        String prenom = Vals.str(body.get("prenom"));
        String email = Vals.str(body.get("email"));
        String motDePasse = Vals.str(body.get("motDePasse"));

        if (nom.isEmpty() || prenom.isEmpty() || email.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Missing data");
        }
        Integer taken = jdbc.queryForObject(
                "SELECT COUNT(*) FROM utilisateur WHERE email = ? AND idUser <> ?", Integer.class, email, userId);
        if (taken != null && taken > 0) throw new ApiException(HttpStatus.CONFLICT, "Email already exists");

        jdbc.update("UPDATE utilisateur SET nom=?, prenom=?, email=? WHERE idUser=?", nom, prenom, email, userId);
        if (!motDePasse.isEmpty()) {
            jdbc.update("UPDATE utilisateur SET motDePasse=? WHERE idUser=?", encoder.encode(motDePasse), userId);
        }
        return Vals.ok("Profil modifié");
    }

    @DeleteMapping("/profile.php")
    public Map<String, Object> delete(@RequestAttribute("userId") int userId) {
        annonces.deleteUser(userId);
        return Vals.ok("Compte supprimé");
    }
}
