// Function to handle the credential response from Google
function handleCredentialResponse(response) {
    // The response.credential is the ID token (JWT)
    const idToken = response.credential;

    // Decode the JWT to get user information
    // IMPORTANT: In a real application, you should send this token to your backend
    // server, verify it there, and then create a session or return user data.
    // For this simple client-side example, we'll decode it directly.
    // This is NOT secure for protecting resources, only for display purposes.
    const decodedToken = jwt_decode(idToken);

    // Display user information
    document.getElementById('userName').innerText = decodedToken.name;
    document.getElementById('userEmail').innerText = decodedToken.email;
    if (decodedToken.picture) {
        document.getElementById('userPicture').src = decodedToken.picture;
    }

    // Show user info and hide sign-in button
    document.getElementById('userInfo').style.display = 'block';
    document.querySelector('.g_id_signin').style.display = 'none'; // Hide Google's button

    // Store email for sign out (optional, can also just clear UI)
    localStorage.setItem('userEmailForSignOut', decodedToken.email);
}

// Simple JWT decoder (for demonstration only - use a library in production)
function jwt_decode(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        console.error("Error decoding JWT", e);
        return null;
    }
}

// Sign out function
function signOut() {
    // Optional: Revoke the token on Google's side
    const userEmail = localStorage.getItem('userEmailForSignOut');
    if (userEmail) {
        google.accounts.id.revoke(userEmail, done => {
            console.log('Consent revoked for ' + userEmail);
            localStorage.removeItem('userEmailForSignOut');
        });
    }

    // Disable one-tap sign-in for the next time
    google.accounts.id.disableAutoSelect();

    // Clear user information from the page
    document.getElementById('userName').innerText = '';
    document.getElementById('userEmail').innerText = '';
    document.getElementById('userPicture').src = '';

    // Hide user info and show sign-in button
    document.getElementById('userInfo').style.display = 'none';
    document.querySelector('.g_id_signin').style.display = 'block'; // Show Google's button
}

// Attach event listener for sign out button
window.onload = () => {
    const signOutButton = document.getElementById('signOutButton');
    if (signOutButton) {
        signOutButton.addEventListener('click', signOut);
    }
};