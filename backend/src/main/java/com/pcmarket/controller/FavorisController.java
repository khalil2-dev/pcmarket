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

/**
 * /favoris.php
 *   GET  -> [annonceId, ...]
 *   POST {idProduit}              -> toggles (the Angular heart button only calls save)
 *   POST {unsave:true, idProduit} -> removes
 * The Angular field is called "idProduit" but it carries the annonce id.
 */
@RestController
public class FavorisController {

    private final JdbcTemplate jdbc;

    public FavorisController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/favoris.php")
    public List<Integer> list(@RequestAttribute("userId") int userId) {
        return jdbc.queryForList(
                "SELECT idAnnonce FROM favori_annonce WHERE idUser = ? ORDER BY created_at DESC",
                Integer.class, userId);
    }

    @PostMapping("/favoris.php")
    public Map<String, Object> toggle(@RequestAttribute("userId") int userId,
                                      @RequestBody Map<String, Object> body) {
        int idAnnonce = Vals.intVal(body.get("idProduit"), "idProduit");
        boolean unsave = Vals.truthy(body.get("unsave"));

        Integer annonce = jdbc.queryForObject(
                "SELECT COUNT(*) FROM annonce WHERE idAnnonce = ?", Integer.class, idAnnonce);
        if (annonce == null || annonce == 0) throw new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable");

        Integer saved = jdbc.queryForObject(
                "SELECT COUNT(*) FROM favori_annonce WHERE idUser = ? AND idAnnonce = ?",
                Integer.class, userId, idAnnonce);
        boolean isSaved = saved != null && saved > 0;

        boolean nowSaved;
        if (unsave || isSaved) {
            jdbc.update("DELETE FROM favori_annonce WHERE idUser = ? AND idAnnonce = ?", userId, idAnnonce);
            nowSaved = false;
        } else {
            jdbc.update("INSERT INTO favori_annonce (idUser, idAnnonce) VALUES (?, ?)", userId, idAnnonce);
            nowSaved = true;
        }

        Map<String, Object> res = Vals.ok(nowSaved ? "Ajouté aux favoris" : "Retiré des favoris");
        res.put("saved", nowSaved);
        return res;
    }
}
