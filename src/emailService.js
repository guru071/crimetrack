/**
 * Email verification service using Firebase only
 * Uses Firebase Authentication email verification
 */

/**
 * Send verification email using Firebase
 * @param {string} email - User's email address
 * @param {string} userId - Firebase user ID
 * @param {string} userName - User's display name
 * @returns {Promise<boolean>}
 */
export async function sendVerificationEmail(email, userId, userName) {
  try {
    void userId;
    void userName;
    // Firebase email verification handled by LoginView.jsx
    // This function returns false to let LoginView use Firebase sendEmailVerification
    // which sends the official Firebase verification email with verification link
    console.log('Email verification: Returning to LoginView to use Firebase sendEmailVerification for', email);
    return false;
  } catch (err) {
    console.error('Email verification error:', err);
    return false;
  }
}
