package com.pcmarket.service;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.pcmarket.common.ApiException;

@Service
public class AnnonceService {

    private static final Logger log = LoggerFactory.getLogger(AnnonceService.class);

    private final JdbcTemplate jdbc;
    private final ImageStorage storage;

    public AnnonceService(JdbcTemplate jdbc, ImageStorage storage) {
        this.jdbc = jdbc;
        this.storage = storage;
    }

    // ------------------------------------------------------------------ LIST

    /** Same JSON shape the Angular pages read: id_annonce, idUser, titre, prix, ..., etat, image[] */
    public List<Map<String, Object>> list(String search, boolean withOwner, Integer userId) {
        StringBuilder sql = new StringBuilder(
                "SELECT a.idAnnonce, a.idUser, a.titre, a.prix, a.description, a.telephone, "
                        + "a.statut, a.datePublication");
        if (withOwner) sql.append(", u.nom AS nomUser, u.prenom AS prenomUser, u.email AS emailUser");
        sql.append(" FROM annonce a");
        if (withOwner) sql.append(" JOIN utilisateur u ON u.idUser = a.idUser");

        List<Object> args = new ArrayList<>();
        if (search != null && !search.isBlank()) {
            sql.append(" WHERE a.titre LIKE ?");
            args.add("%" + search.trim() + "%");
        }
        sql.append(" ORDER BY a.idAnnonce DESC");

        List<Map<String, Object>> rows = jdbc.query(sql.toString(), (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id_annonce", rs.getInt("idAnnonce"));
            m.put("idUser", rs.getInt("idUser"));
            m.put("titre", rs.getString("titre"));
            BigDecimal prix = rs.getBigDecimal("prix");
            m.put("prix", prix);
            m.put("description", rs.getString("description"));
            m.put("telephone", rs.getString("telephone"));
            m.put("etat", rs.getString("statut"));
            Timestamp t = rs.getTimestamp("datePublication");
            m.put("datePublication", t == null ? null : t.toString());
            if (withOwner) {
                m.put("nomUser", rs.getString("nomUser"));
                m.put("prenomUser", rs.getString("prenomUser"));
                m.put("emailUser", rs.getString("emailUser"));
            }
            return m;
        }, args.toArray());

        Map<Integer, List<String>> images = new LinkedHashMap<>();
        jdbc.query("SELECT idAnnonce, chemin FROM image ORDER BY idImage", rs -> {
            images.computeIfAbsent(rs.getInt("idAnnonce"), k -> new ArrayList<>()).add(rs.getString("chemin"));
        });
        for (Map<String, Object> m : rows) {
            m.put("image", images.getOrDefault((Integer) m.get("id_annonce"), new ArrayList<>()));
        }

        log.info("GET ANNONCES userId={} search={} count={}", userId, search, rows.size());
        return rows;
    }

    // ---------------------------------------------------------------- CREATE

    /**
     * 1. validate everything, 2. INSERT annonce, 3. read the real generated id,
     * 4. store images + INSERT image rows. Any failure rolls the transaction back and
     * removes the files already written, so success is only returned when all of it worked.
     */
    @Transactional
    public int create(int userId, String titre, BigDecimal prix, String description,
                      String telephone, String etat, List<MultipartFile> images) {

        for (MultipartFile f : images) storage.validate(f);

        log.info("CREATE ANNONCE userId={} titre={} prix={} images={}", userId, titre, prix, images.size());

        List<String> saved = new ArrayList<>();
        try {
            // PostgreSQL: RETURNING gives back the generated id directly
            Integer id = jdbc.queryForObject(
                    "INSERT INTO annonce (idUser, titre, prix, description, telephone, statut) "
                            + "VALUES (?, ?, ?, ?, ?, ?) RETURNING idAnnonce",
                    Integer.class, userId, titre, prix, description, telephone, etat);

            if (id == null) {
                throw new IllegalStateException("Annonce insertion failed");
            }
            int idAnnonce = id;
            log.info("INSERTED annonce ID={}", idAnnonce);

            for (MultipartFile f : images) {
                String name = storage.save(f);
                saved.add(name);
                jdbc.update("INSERT INTO image (idAnnonce, chemin) VALUES (?, ?)", idAnnonce, name);
            }
            return idAnnonce;
        } catch (RuntimeException e) {
            saved.forEach(storage::delete);
            log.error("CREATE ANNONCE ERROR: {}", e.getMessage(), e);
            throw e;
        }
    }

    // ---------------------------------------------------------------- UPDATE

    public void update(int userId, boolean admin, int id, String titre, BigDecimal prix,
                       String description, String telephone, String etat) {
        checkOwner(userId, admin, id);
        jdbc.update("UPDATE annonce SET titre=?, prix=?, description=?, telephone=?, statut=? "
                + "WHERE idAnnonce=?", titre, prix, description, telephone, etat, id);
    }

    // ---------------------------------------------------------------- DELETE

    @Transactional
    public void delete(int userId, boolean admin, int id) {
        checkOwner(userId, admin, id);
        List<String> files = jdbc.queryForList("SELECT chemin FROM image WHERE idAnnonce = ?", String.class, id);
        jdbc.update("DELETE FROM favori_annonce WHERE idAnnonce = ?", id);
        jdbc.update("DELETE FROM image WHERE idAnnonce = ?", id);
        jdbc.update("DELETE FROM annonce WHERE idAnnonce = ?", id);
        files.forEach(storage::delete);
    }

    /** Deletes a user with their annonces, images (rows + files) and favourites. */
    @Transactional
    public void deleteUser(int idUser) {
        List<String> files = jdbc.queryForList(
                "SELECT i.chemin FROM image i JOIN annonce a ON a.idAnnonce = i.idAnnonce WHERE a.idUser = ?",
                String.class, idUser);
        jdbc.update("DELETE FROM favori_annonce WHERE idUser = ? "
                + "OR idAnnonce IN (SELECT idAnnonce FROM annonce WHERE idUser = ?)", idUser, idUser);
        jdbc.update("DELETE FROM image WHERE idAnnonce IN (SELECT idAnnonce FROM annonce WHERE idUser = ?)", idUser);
        jdbc.update("DELETE FROM annonce WHERE idUser = ?", idUser);
        jdbc.update("DELETE FROM utilisateur WHERE idUser = ?", idUser);
        files.forEach(storage::delete);
    }

    /** Admin: delete the annonce's owner (and therefore the annonce). Admin accounts are protected. */
    @Transactional
    public void deleteAnnonceAndOwner(int idAnnonce) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT a.idUser, u.role FROM annonce a JOIN utilisateur u ON u.idUser = a.idUser "
                        + "WHERE a.idAnnonce = ?", idAnnonce);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable");
        if ("admin".equals(String.valueOf(rows.get(0).get("role")))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Impossible de supprimer un compte admin");
        }
        deleteUser(((Number) rows.get(0).get("idUser")).intValue());
    }

    // --------------------------------------------------------------- HELPERS

    private void checkOwner(int userId, boolean admin, int idAnnonce) {
        List<Integer> owner = jdbc.queryForList("SELECT idUser FROM annonce WHERE idAnnonce = ?",
                Integer.class, idAnnonce);
        if (owner.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Annonce introuvable");
        if (owner.get(0) != userId && !admin) throw new ApiException(HttpStatus.FORBIDDEN, "Interdit");
    }
}