# PCMarket backend (Spring Boot) - replaces the PHP backend

Same URLs as before (`http://localhost/backend/*.php`), so the Angular app is NOT modified.

## Run
1. Stop Apache in XAMPP (Spring uses port 80). Keep MySQL running.
2. phpMyAdmin -> database `marketplace_pc` -> SQL tab -> run `spring_migration.sql`.
3. Check `src/main/resources/application.properties` (DB user/password).
4. `mvn spring-boot:run`  (JDK 17+ and Maven required; or open the folder in IntelliJ / VS Code and run PcMarketApplication).
5. Test: http://localhost/backend/annonce.php  ->  {"success":false,"message":"No token"}

Old images: copy your existing `backend/images/*` into this project's `images/` folder.
Existing users keep working (BCrypt hashes from PHP `password_hash` are compatible).

## Endpoints
| URL | Methods |
|---|---|
| /login.php, /register.php | POST (form-data or JSON) |
| /profile.php | GET, PUT, DELETE |
| /annonce.php | GET, POST (multipart create / JSON update+delete) |
| /favoris.php | GET, POST (toggle / unsave) |
| /admin/stats.php, /admin/users.php, /admin/annonces.php, /admin/delete-annonce-user.php | admin only |
| /images/{file} | public |
