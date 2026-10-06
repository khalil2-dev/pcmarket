package com.pcmarket.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.pcmarket.common.ApiException;
import com.pcmarket.common.Vals;
import com.pcmarket.service.AnnonceService;

/** /admin/*.php - protected by AuthInterceptor (role must be "admin"). */
@RestController
public class AdminController {

    private final JdbcTemplate jdbc;
    private final AnnonceService annonces;

    public AdminController(JdbcTemplate jdbc, AnnonceService annonces) {
        this.jdbc = jdbc;
        this.annonces = annonces;
    }

    // ------------------------------------------------------------------ STATS

    /** {users:{total,day,week,month}, annonces:{total,day,week,month}} (last 1 / 7 / 30 days) */
    @GetMapping("/admin/stats.php")
    public Map<String, Object> stats() {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("users", counts("utilisateur", "dateInscription"));
        res.put("annonces", counts("annonce", "datePublication"));
        return res;
    }

    private Map<String, Object> counts(String table, String dateColumn) {
        // table/column names are constants from this class, never user input
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", count("SELECT COUNT(*) FROM " + table));
        m.put("day", count("SELECT COUNT(*) FROM " + table + " WHERE " + dateColumn + " >= NOW() - INTERVAL '1 day'"));
        m.put("week", count("SELECT COUNT(*) FROM " + table + " WHERE " + dateColumn + " >= NOW() - INTERVAL '7 days'"));
        m.put("month", count("SELECT COUNT(*) FROM " + table + " WHERE " + dateColumn + " >= NOW() - INTERVAL '30 days'"));
        return m;
    }

    private long count(String sql) {
        Long n = jdbc.queryForObject(sql, Long.class);
        return n == null ? 0 : n;
    }

    // ------------------------------------------------------------------ USERS

    @GetMapping("/admin/users.php")
    public List<Map<String, Object>> users() {
        return jdbc.queryForList("SELECT idUser, nom, prenom, email, role FROM utilisateur ORDER BY idUser");
    }

    @PostMapping("/admin/users.php")
    public Map<String, Object> deleteUser(@RequestAttribute("userId") int adminId,
                                          @RequestBody Map<String, Object> body) {
        if (!Vals.truthy(body.get("deleteUser"))) throw new ApiException(HttpStatus.BAD_REQUEST, "Action inconnue");

        int idUser = Vals.intVal(body.get("idUser"), "idUser");
        if (idUser == adminId) throw new ApiException(HttpStatus.BAD_REQUEST, "Vous ne pouvez pas vous supprimer");

        List<String> role = jdbc.queryForList("SELECT role FROM utilisateur WHERE idUser = ?", String.class, idUser);
        if (role.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Utilisateur introuvable");
        if ("admin".equals(role.get(0))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Impossible de supprimer un compte admin");
        }

        annonces.deleteUser(idUser);
        return Vals.ok("Utilisateur supprimé");
    }

    // --------------------------------------------------------------- ANNONCES

    @GetMapping("/admin/annonces.php")
    public List<Map<String, Object>> annonces(@RequestAttribute("userId") int adminId) {
        return annonces.list(null, true, adminId);
    }

    @PostMapping("/admin/annonces.php")
    public Map<String, Object> deleteAnnonce(@RequestAttribute("userId") int adminId,
                                             @RequestBody Map<String, Object> body) {
        annonces.delete(adminId, true, Vals.intVal(body.get("id_annonce"), "id_annonce"));
        return Vals.ok("Annonce supprimée");
    }

    @PostMapping("/admin/delete-annonce-user.php")
    public Map<String, Object> deleteAnnonceAndUser(@RequestBody Map<String, Object> body) {
        annonces.deleteAnnonceAndOwner(Vals.intVal(body.get("id_annonce"), "id_annonce"));
        return Vals.ok("Annonce et utilisateur supprimés");
    }
}