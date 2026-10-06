package com.pcmarket.controller;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.pcmarket.common.ApiException;
import com.pcmarket.common.Vals;
import com.pcmarket.service.AnnonceService;

/**
 * /annonce.php - the single URL used by ApiService:
 *   GET                       -> list (plain JSON array)
 *   POST multipart            -> create   (fields + images[])
 *   POST json {action:update} -> update
 *   POST json {delete:true}   -> delete
 */
@RestController
public class AnnonceController {

    private final AnnonceService service;

    public AnnonceController(AnnonceService service) {
        this.service = service;
    }

    @GetMapping("/annonce.php")
    public List<Map<String, Object>> list(@RequestAttribute("userId") int userId,
                                          @RequestParam(name = "search", required = false) String search) {
        return service.list(search, false, userId);
    }

    @PostMapping(value = "/annonce.php", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> create(
            @RequestAttribute("userId") int userId,
            @RequestParam(name = "titre", defaultValue = "") String titre,
            @RequestParam(name = "prix", required = false) String prix,
            @RequestParam(name = "description", defaultValue = "") String description,
            @RequestParam(name = "telephone", defaultValue = "") String telephone,
            @RequestParam(name = "etat", defaultValue = "active") String etat,
            @RequestParam(name = "images[]", required = false) List<MultipartFile> images) {

        titre = titre.trim();
        description = description.trim();
        telephone = telephone.trim();
        etat = etat.isBlank() ? "active" : etat.trim();
        BigDecimal price = parsePrice(prix);

        if (titre.isEmpty() || description.isEmpty() || telephone.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Données invalides");
        }

        List<MultipartFile> files = new ArrayList<>();
        if (images != null) {
            for (MultipartFile f : images) if (f != null && !f.isEmpty()) files.add(f);
        }
        if (files.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Au moins une image est requise");
        }

        int id = service.create(userId, titre, price, description, telephone, etat, files);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("message", "Annonce ajoutée");
        res.put("id_annonce", id);          // the REAL generated id
        return res;
    }

    @PostMapping(value = "/annonce.php", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> jsonAction(@RequestAttribute("userId") int userId,
                                          @RequestAttribute("role") String role,
                                          @RequestBody Map<String, Object> body) {
        boolean admin = "admin".equals(role);

        if (Vals.truthy(body.get("delete"))) {
            service.delete(userId, admin, Vals.intVal(body.get("id_annonce"), "id_annonce"));
            return Vals.ok("Annonce supprimée");
        }

        if ("update".equals(Vals.str(body.get("action")))) {
            int id = Vals.intVal(body.get("id_annonce"), "id_annonce");
            String titre = Vals.str(body.get("titre"));
            String description = Vals.str(body.get("description"));
            String telephone = Vals.str(body.get("telephone"));
            String etat = Vals.str(body.get("etat"));
            if (etat.isEmpty()) etat = "active";
            BigDecimal price = parsePrice(Vals.str(body.get("prix")));

            if (titre.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Données invalides");

            service.update(userId, admin, id, titre, price, description, telephone, etat);
            Map<String, Object> res = Vals.ok("Annonce modifiée");
            res.put("id_annonce", id);
            return res;
        }

        throw new ApiException(HttpStatus.BAD_REQUEST, "Action inconnue");
    }

    private static BigDecimal parsePrice(String prix) {
        try {
            BigDecimal p = new BigDecimal(prix == null ? "" : prix.trim());
            if (p.signum() < 0) throw new NumberFormatException();
            return p;
        } catch (NumberFormatException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Prix invalide");
        }
    }
}
