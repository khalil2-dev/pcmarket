package com.pcmarket.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.pcmarket.common.ApiException;

@Component
public class ImageStorage {

    private static final long MAX_SIZE = 2L * 1024 * 1024;
    private final Path dir;

    public ImageStorage(@Value("${app.upload-dir}") String uploadDir) throws IOException {
        this.dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(dir);
    }

    /** Throws ApiException(400) unless the file is a real JPG/PNG of at most 2 MB. */
    public void validate(MultipartFile f) {
        if (f.getSize() > MAX_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image trop grande (max 2MB)");
        }
        if (extension(f) == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Seulement JPG et PNG");
        }
    }

    /** Stores the file and returns the generated file name. */
    public String save(MultipartFile f) {
        String ext = extension(f);
        if (ext == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Seulement JPG et PNG");
        String name = UUID.randomUUID() + "." + ext;
        try (InputStream in = f.getInputStream()) {
            Files.copy(in, dir.resolve(name));
        } catch (IOException e) {
            throw new IllegalStateException("Upload failed", e);
        }
        return name;
    }

    public void delete(String name) {
        if (name == null || name.isBlank()) return;
        try {
            // getFileName() blocks any path traversal
            Files.deleteIfExists(dir.resolve(Paths.get(name).getFileName().toString()));
        } catch (IOException ignored) {
            // a leftover file is not worth failing the request
        }
    }

    /** Detects the type from the file content (magic bytes), not from the client's header. */
    private String extension(MultipartFile f) {
        try (InputStream in = f.getInputStream()) {
            byte[] h = in.readNBytes(4);
            if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) {
                return "jpg";
            }
            if (h.length >= 4 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') {
                return "png";
            }
            return null;
        } catch (IOException e) {
            return null;
        }
    }
}
