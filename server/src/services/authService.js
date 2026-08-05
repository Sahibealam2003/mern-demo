/**
 * authService.js
 *
 * Authentication logic is handled directly in authController.js, which calls:
 *   - tokenService.js  → JWT generation / verification
 *   - emailService.js  → transactional emails
 *   - User model       → password hashing (pre-save hook) and comparison
 *
 * This file is kept as a placeholder in case you want to extract
 * shared auth helpers here in the future.
 */

export default {};
