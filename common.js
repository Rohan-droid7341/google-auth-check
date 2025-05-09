// common.js

const GOOGLE_CLIENT_ID = "368690369318-8ck0l2dtkdusm85to4aifiboovkhpqcu.apps.googleusercontent.com"; // <-- REPLACE THIS
const ID_TOKEN_KEY = 'googleIdToken';
const LOGGED_IN_USERS_KEY = 'loggedInUserIds';
const USER_ACTIVITY_KEY = 'userActivityLog';

// --- Authentication Functions ---

// Function to handle the credential response from Google (called from index.html)
function handleCredentialResponse(response) {
    const idToken = response.credential;
    localStorage.setItem(ID_TOKEN_KEY, idToken);

    const decodedToken = jwt_decode(idToken);
    if (decodedToken && decodedToken.sub) {
        trackUniqueLogin(decodedToken.sub); // 'sub' is Google's unique ID for the user
        logUserActivity('login', window.location.pathname, decodedToken.sub);
        window.location.href = 'dashboard.html'; // Redirect to dashboard after successful login
    } else {
        console.error("Failed to decode token or get sub from token.");
        // Potentially show an error to the user
        localStorage.removeItem(ID_TOKEN_KEY); // Clear invalid token
    }
}

function signOut() {
    const idToken = localStorage.getItem(ID_TOKEN_KEY);
    if (idToken) {
        const decodedToken = jwt_decode(idToken);
        if (decodedToken && decodedToken.email) {
            // Ensure google.accounts.id is loaded
            if (window.google && google.accounts && google.accounts.id) {
                google.accounts.id.revoke(decodedToken.email, done => {
                    console.log('User token revoked for ' + decodedToken.email);
                });
            }
        }
    }
    if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
    }
    localStorage.removeItem(ID_TOKEN_KEY);
    // Don't clear LOGGED_IN_USERS_KEY or USER_ACTIVITY_KEY on sign out
    window.location.href = 'index.html';
}

function checkLoginStatusAndProtectPage() {
    const idToken = localStorage.getItem(ID_TOKEN_KEY);
    const currentPage = window.location.pathname.split('/').pop(); // e.g., "index.html" or "" for root

    if (!idToken) {
        if (currentPage !== 'index.html' && currentPage !== '') {
            window.location.href = 'index.html';
        }
        return null;
    }

    try {
        const decodedToken = jwt_decode(idToken);
        // Basic check: does token exist and is decodable?
        // Add real token expiry check here for production:
        // if (decodedToken.exp * 1000 < Date.now()) {
        //     console.log("Token expired");
        //     signOut(); // Or try to refresh
        //     return null;
        // }
        return decodedToken;
    } catch (e) {
        console.error("Error decoding token, signing out:", e);
        signOut(); // Clear bad token and redirect
        return null;
    }
}

// --- Tracking Functions ---

function trackUniqueLogin(userId) {
    let loggedInUsers = JSON.parse(localStorage.getItem(LOGGED_IN_USERS_KEY)) || [];
    if (!loggedInUsers.includes(userId)) {
        loggedInUsers.push(userId);
        localStorage.setItem(LOGGED_IN_USERS_KEY, JSON.stringify(loggedInUsers));
    }
}

function getUniqueLoginCount() {
    const loggedInUsers = JSON.parse(localStorage.getItem(LOGGED_IN_USERS_KEY)) || [];
    return loggedInUsers.length;
}

function logUserActivity(action, page, userIdOverride = null) {
    const idToken = localStorage.getItem(ID_TOKEN_KEY);
    let userId = userIdOverride;

    if (!userId && idToken) {
        try {
            const decoded = jwt_decode(idToken);
            if (decoded) userId = decoded.sub;
        } catch (e) { console.error("Could not get user ID for activity log"); return; }
    } else if (!userId && !userIdOverride) {
        console.warn("Cannot log activity: user ID not available.");
        return;
    }
    if (!userId) { // Still no userId, abort
        console.warn("No UserID found for logging activity for action: " + action);
        return;
    }

    let activityLog = JSON.parse(localStorage.getItem(USER_ACTIVITY_KEY)) || [];
    activityLog.push({
        userId: userId,
        action: action,
        page: page.startsWith('/') ? page : '/' + page, // Ensure leading slash for consistency
        timestamp: new Date().toISOString()
    });
    // Keep log from growing indefinitely (e.g., last 100 activities)
    if (activityLog.length > 100) {
        activityLog = activityLog.slice(activityLog.length - 100);
    }
    localStorage.setItem(USER_ACTIVITY_KEY, JSON.stringify(activityLog));
}

function getUserActivity() {
    return JSON.parse(localStorage.getItem(USER_ACTIVITY_KEY)) || [];
}

// --- Utility Functions ---

function jwt_decode(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding JWT", e);
        return null;
    }
}

function displayUserInfo(decodedToken, nameElId = 'userName', emailElId = 'userEmail', pictureElId = 'userPicture') {
    if (!decodedToken) return;

    const userNameEl = document.getElementById(nameElId);
    const userEmailEl = document.getElementById(emailElId);
    const userPictureEl = document.getElementById(pictureElId);

    if (userNameEl) userNameEl.innerText = decodedToken.name || 'N/A';
    if (userEmailEl) userEmailEl.innerText = decodedToken.email || 'N/A';
    if (userPictureEl && decodedToken.picture) {
        userPictureEl.src = decodedToken.picture;
        userPictureEl.style.display = 'block';
    } else if (userPictureEl) {
        userPictureEl.style.display = 'none';
    }

    const userNameSmallEl = document.getElementById('userNameSmall');
    const userPictureSmallEl = document.getElementById('userPictureSmall');

    if (userNameSmallEl) userNameSmallEl.innerText = `${decodedToken.name || decodedToken.email}`;
    if (userPictureSmallEl && decodedToken.picture) {
        userPictureSmallEl.src = decodedToken.picture;
        userPictureSmallEl.style.display = 'inline-block';
    } else if (userPictureSmallEl) {
        userPictureSmallEl.style.display = 'none';
    }
}

function initializeProtectedPage() {
    const loggedInUser = checkLoginStatusAndProtectPage();
    if (loggedInUser) {
        displayUserInfo(loggedInUser); // For main content placeholders
        logUserActivity('view', window.location.pathname.split('/').pop(), loggedInUser.sub);

        const signOutButton = document.getElementById('signOutButton');
        if (signOutButton) {
            signOutButton.addEventListener('click', signOut);
        }
    }
    // If !loggedInUser, checkLoginStatusAndProtectPage already handled redirect
    return loggedInUser; // Return user for further page-specific use if needed
}

// --- Global Initialization ---
window.onload = function () {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html'; // Handle root path

    if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse // This callback is for the One Tap or button click
        });

        if ((currentPage === 'index.html' || currentPage === '') && !localStorage.getItem(ID_TOKEN_KEY)) {
            const signInButtonDiv = document.getElementById('g_id_signin');
            if (signInButtonDiv) {
                google.accounts.id.renderButton(
                    signInButtonDiv,
                    { theme: "outline", size: "large", text: "signin_with", shape: "rectangular", logo_alignment: "left" }
                );
            }
            // google.accounts.id.prompt(); // Optionally show One Tap prompt
        }
    } else {
        console.error("Google Identity Services script not loaded yet or failed to load.");
        // You might want to add a retry mechanism or display an error to the user.
    }


    if (currentPage === 'index.html' || currentPage === '') {
        // If on login page and already logged in, redirect to dashboard
        const idToken = localStorage.getItem(ID_TOKEN_KEY);
        if (idToken) {
            try {
                const decoded = jwt_decode(idToken);
                if (decoded) { // Basic check, could add expiry check
                    window.location.href = 'dashboard.html';
                    return; // Stop further processing on this page
                } else {
                     localStorage.removeItem(ID_TOKEN_KEY); // Invalid token
                }
            } catch (e) {
                localStorage.removeItem(ID_TOKEN_KEY); // Error decoding
            }
        }
    } else {
        // This is a protected page
        const loggedInUser = initializeProtectedPage(); // Sets up user info, sign out, and returns user
        if (loggedInUser) { // Ensure user is actually logged in before proceeding
            if (currentPage === 'admin.html' && typeof initializeAdminPageData === 'function') {
                initializeAdminPageData(loggedInUser);
            }
            // Add similar for other pages:
            // if (currentPage === 'profile.html' && typeof initializeProfilePageData === 'function') {
            //    initializeProfilePageData(loggedInUser);
            // }
        }
    }

    // Highlight active nav link
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
};