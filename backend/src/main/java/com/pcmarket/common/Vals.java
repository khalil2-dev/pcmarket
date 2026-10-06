package com.pcmarket.common;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;

/** Small helpers to read loosely typed request values. */
public final class Vals {
    private Vals() {}

    public static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    public static boolean truthy(Object o) {
        return Boolean.TRUE.equals(o) || "true".equalsIgnoreCase(str(o)) || "1".equals(str(o));
    }

    public static int intVal(Object o, String field) {
        try {
            if (o instanceof Number n) return n.intValue();
            return Integer.parseInt(str(o));
        } catch (NumberFormatException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Valeur invalide : " + field);
        }
    }

    public static Map<String, Object> ok(String message) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("message", message);
        return m;
    }

    /** Format used by login/register (the Angular code checks res.status). */
    public static Map<String, Object> status(String status, String message) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", status);
        m.put("message", message);
        return m;
    }
}
